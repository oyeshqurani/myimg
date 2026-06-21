/**
 * WebP Converter Main Application Logic
 * Implements high-performance client-side conversion, target-size optimization,
 * ZIP export, and server-side PHP fallback.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const sizeLimitToggle = document.getElementById('size-limit-toggle');
    const targetSizeContainer = document.getElementById('target-size-container');
    const targetSizeInput = document.getElementById('target-size-input');
    const modeTabs = document.querySelectorAll('.mode-tab');
    const queueList = document.getElementById('queue-list');
    const clearQueueBtn = document.getElementById('clear-queue-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const queueCount = document.getElementById('queue-count');
    const queueSize = document.getElementById('queue-size');
    const toastContainer = document.getElementById('toast-container');

    // State Variables
    let conversionQueue = [];
    let activeConversions = 0;
    const MAX_CONCURRENT = 3;
    let currentMode = 'client'; // 'client' or 'server'

    // Initialize Tooltips / Default states
    qualityValue.textContent = qualitySlider.value + '%';
    
    // Check if JSZip is loaded, warning fallback
    if (typeof JSZip === 'undefined') {
        showToast('JSZip library is missing. Bulk download as ZIP will fall back to sequential downloads.', 'info');
    }

    // Check if running on local file protocol (cannot use PHP server-side)
    if (window.location.protocol === 'file:') {
        const serverTab = document.querySelector('.mode-tab[data-mode="server"]');
        if (serverTab) {
            serverTab.disabled = true;
            serverTab.style.opacity = '0.5';
            serverTab.style.cursor = 'not-allowed';
            serverTab.title = 'PHP mode requires running under localhost (XAMPP)';
            
            // Overwrite tab selection to prevent switching
            serverTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showToast('PHP Server Mode is unavailable when opened directly as a file. Please open via http://localhost/towebp/', 'error');
            }, true);
        }
    }

    /* --- Event Listeners --- */

    // Quality slider change
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
    });

    // Size limit toggle
    sizeLimitToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            targetSizeContainer.classList.add('visible');
        } else {
            targetSizeContainer.classList.remove('visible');
        }
    });

    // Mode tab toggling
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.mode;
            showToast(`Switched to ${currentMode === 'client' ? 'Client-side' : 'PHP Server-side'} conversion.`, 'info');
        });
    });

    // Dropzone Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Dropzone Click -> triggers file input
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset value to allow uploading same file again
    });

    // Queue Control Buttons
    clearQueueBtn.addEventListener('click', clearQueue);
    downloadAllBtn.addEventListener('click', downloadAll);

    /* --- Core Logic Functions --- */

    // Parse and add files to the queue
    function handleFiles(files) {
        if (!files || files.length === 0) return;

        let addedCount = 0;

        Array.from(files).forEach(file => {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                showToast(`"${file.name}" is not a valid image.`, 'error');
                return;
            }

            // Create queue item state
            const id = 'item_' + Math.random().toString(36).substr(2, 9);
            const queueItem = {
                id: id,
                file: file,
                name: file.name,
                originalSize: file.size,
                convertedSize: 0,
                status: 'pending', // 'pending', 'processing', 'success', 'error'
                progress: 0,
                blob: null,
                errorMsg: ''
            };

            conversionQueue.push(queueItem);
            renderQueueItem(queueItem);
            addedCount++;
        });

        if (addedCount > 0) {
            updateSummary();
            processQueue();
        }
    }

    // Render an item card in the UI
    function renderQueueItem(item) {
        const itemHtml = `
            <div class="queue-item" id="${item.id}">
                <div class="item-preview">
                    <img src="${URL.createObjectURL(item.file)}" alt="${escapeHtml(item.name)}" onload="URL.revokeObjectURL(this.src)">
                </div>
                <div class="item-info">
                    <div class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                    <div class="item-meta">
                        <span class="size-tag">${formatBytes(item.originalSize)}</span>
                        <span class="arrow-icon" style="display: none;">&rarr;</span>
                        <span class="size-tag converted-size" style="display: none;"></span>
                        <span class="savings-badge" style="display: none;"></span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="status-indicator">
                        <span class="progress-spinner" style="display: none;"></span>
                    </div>
                    <button class="item-download-btn" title="Download WebP" style="display: none;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button class="item-server-delete-btn" title="Delete File from Server" style="display: none;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path><path d="M19 19l-4-4m0 4l4-4"></path></svg>
                    </button>
                    <button class="item-delete-btn" title="Remove">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
                <div class="item-progress-bar"></div>
            </div>
        `;
        queueList.insertAdjacentHTML('beforeend', itemHtml);

        // Bind delete action
        const element = document.getElementById(item.id);
        element.querySelector('.item-delete-btn').addEventListener('click', () => {
            removeItem(item.id);
        });
    }

    // Remove file from queue
    function removeItem(id) {
        const index = conversionQueue.findIndex(item => item.id === id);
        if (index > -1) {
            const item = conversionQueue[index];
            if (item.blob) {
                if (item.blob.startsWith('download.php?token=')) {
                    deleteFromServerSilently(item);
                } else {
                    URL.revokeObjectURL(item.blob);
                }
            }
            conversionQueue.splice(index, 1);
            
            // Remove DOM element
            const el = document.getElementById(id);
            if (el) el.remove();

            updateSummary();
            processQueue();
        }
    }

    // Update queue counts and savings summaries
    function updateSummary() {
        const total = conversionQueue.length;
        const processed = conversionQueue.filter(item => item.status === 'success').length;
        
        queueCount.textContent = `${processed}/${total} Converted`;
        
        // Calculate total savings
        let totalOriginal = 0;
        let totalConverted = 0;
        conversionQueue.forEach(item => {
            if (item.status === 'success') {
                totalOriginal += item.originalSize;
                totalConverted += item.convertedSize;
            }
        });

        if (totalOriginal > 0 && totalConverted > 0) {
            const savings = Math.max(0, Math.round(((totalOriginal - totalConverted) / totalOriginal) * 100));
            queueSize.textContent = `Saved ${savings}% (${formatBytes(totalOriginal - totalConverted)})`;
        } else {
            queueSize.textContent = 'Queue size: ' + formatBytes(conversionQueue.reduce((acc, item) => acc + item.originalSize, 0));
        }

        // Enable / Disable buttons
        clearQueueBtn.disabled = total === 0;
        downloadAllBtn.disabled = processed === 0;
    }

    // Sequential Queue Processing
    function processQueue() {
        if (activeConversions >= MAX_CONCURRENT) return;

        const nextItem = conversionQueue.find(item => item.status === 'pending');
        if (!nextItem) return;

        activeConversions++;
        nextItem.status = 'processing';
        updateItemUI(nextItem);

        if (currentMode === 'client') {
            runClientConversion(nextItem);
        } else {
            runServerConversion(nextItem);
        }
    }

    // Update the visual state of a queue item
    function updateItemUI(item) {
        const el = document.getElementById(item.id);
        if (!el) return;

        const spinner = el.querySelector('.progress-spinner');
        const downloadBtn = el.querySelector('.item-download-btn');
        const arrow = el.querySelector('.arrow-icon');
        const convertedSizeSpan = el.querySelector('.converted-size');
        const savingsBadge = el.querySelector('.savings-badge');
        const progressBar = el.querySelector('.item-progress-bar');

        if (item.status === 'processing') {
            spinner.style.display = 'block';
            progressBar.style.width = '30%';
        } else if (item.status === 'success') {
            spinner.style.display = 'none';
            progressBar.style.width = '100%';
            
            // Show sizes and savings
            arrow.style.display = 'inline';
            convertedSizeSpan.textContent = formatBytes(item.convertedSize);
            convertedSizeSpan.style.display = 'inline';

            const pct = Math.round(((item.originalSize - item.convertedSize) / item.originalSize) * 100);
            if (pct > 0) {
                savingsBadge.textContent = `-${pct}%`;
                savingsBadge.className = 'savings-badge';
            } else {
                savingsBadge.textContent = `+${Math.abs(pct)}%`;
                savingsBadge.className = 'savings-badge neutral';
            }
            savingsBadge.style.display = 'inline';

            // Show and configure download button
            downloadBtn.style.display = 'flex';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = item.blob;
                a.download = changeExtension(item.name, 'webp');
                a.click();
            };

            // Show and configure server delete button if applicable
            const serverDeleteBtn = el.querySelector('.item-server-delete-btn');
            if (item.blob && item.blob.startsWith('download.php?token=')) {
                serverDeleteBtn.style.display = 'flex';
                serverDeleteBtn.onclick = () => {
                    deleteFromServer(item);
                };
            } else {
                serverDeleteBtn.style.display = 'none';
            }
        } else if (item.status === 'error') {
            spinner.style.display = 'none';
            progressBar.style.width = '100%';
            progressBar.style.background = 'var(--danger)';
            
            // Display error detail
            convertedSizeSpan.textContent = item.errorMsg || 'Failed';
            convertedSizeSpan.style.color = 'var(--danger)';
            convertedSizeSpan.style.display = 'inline';
        }
    }

    /* --- Conversion Implementations --- */

    // Client-side Javascript Canvas Conversion
    async function runClientConversion(item) {
        try {
            const img = new Image();
            img.src = URL.createObjectURL(item.file);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image structure.'));
            });

            // Clean up Object URL
            URL.revokeObjectURL(img.src);

            const options = {
                quality: parseInt(qualitySlider.value) / 100,
                fitSize: sizeLimitToggle.checked,
                targetSizeKb: parseInt(targetSizeInput.value) || 100
            };

            let webpBlob;

            if (options.fitSize) {
                webpBlob = await convertWithTargetSize(img, options.targetSizeKb * 1024, options.quality);
            } else {
                // Direct conversion
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                webpBlob = await getCanvasBlob(canvas, options.quality);
            }

            item.status = 'success';
            item.convertedSize = webpBlob.size;
            item.webpBlob = webpBlob;
            item.blob = URL.createObjectURL(webpBlob);
            
        } catch (err) {
            console.error(err);
            item.status = 'error';
            item.errorMsg = err.message || 'Conversion failed';
        } finally {
            activeConversions--;
            updateItemUI(item);
            updateSummary();
            processQueue();
        }
    }

    // Helper to get Canvas Blob as a Promise
    function getCanvasBlob(canvas, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas blob generation returned null.'));
                }
            }, 'image/webp', quality);
        });
    }

    // Target-size Binary Search Optimization (Client Side)
    async function convertWithTargetSize(img, targetBytes, startingQuality) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const origWidth = img.naturalWidth;
        const origHeight = img.naturalHeight;

        // Stage 1: Try default/selected quality at 100% scale
        canvas.width = origWidth;
        canvas.height = origHeight;
        ctx.drawImage(img, 0, 0);
        
        let blob = await getCanvasBlob(canvas, startingQuality);
        if (blob.size <= targetBytes) {
            return blob; // Success, fits target size
        }

        // Stage 2: Quality Compression Search (from starting quality down to 0.40)
        let qLow = 0.40;
        let qHigh = startingQuality;
        let bestQualityBlob = blob;

        // Try binary search on quality (max 4 iterations)
        for (let i = 0; i < 4; i++) {
            let midQ = (qLow + qHigh) / 2;
            let testBlob = await getCanvasBlob(canvas, midQ);
            
            if (testBlob.size <= targetBytes) {
                bestQualityBlob = testBlob;
                qLow = midQ; // try to push quality higher if possible
            } else {
                qHigh = midQ; // size too big, lower the boundary
                if (testBlob.size < bestQualityBlob.size) {
                    bestQualityBlob = testBlob;
                }
            }
        }

        if (bestQualityBlob.size <= targetBytes) {
            return bestQualityBlob;
        }

        // Stage 3: Scale down Resolution recursively
        // We incrementally downscale image dimensions (down to 15%) while maintaining a visual quality of 0.60
        let scaleLow = 0.15;
        let scaleHigh = 0.95;
        let bestScaledBlob = bestQualityBlob;

        for (let i = 0; i < 5; i++) {
            let midScale = (scaleLow + scaleHigh) / 2;
            let w = Math.round(origWidth * midScale);
            let h = Math.round(origHeight * midScale);
            
            canvas.width = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            
            let testBlob = await getCanvasBlob(canvas, 0.65); // standard quality 65% for downscaling
            
            if (testBlob.size <= targetBytes) {
                bestScaledBlob = testBlob;
                scaleLow = midScale; // try to make it larger if it fits
            } else {
                scaleHigh = midScale; // still too big, scale down more
                if (testBlob.size < bestScaledBlob.size) {
                    bestScaledBlob = testBlob;
                }
            }
        }

        return bestScaledBlob;
    }

    // Server-side PHP Conversion call
    function runServerConversion(item) {
        const formData = new FormData();
        formData.append('image', item.file);
        formData.append('quality', qualitySlider.value);
        
        if (sizeLimitToggle.checked) {
            formData.append('targetSize', targetSizeInput.value);
        }

        fetch('convert.php', {
            method: 'POST',
            body: formData
        })
        .then(async (response) => {
            const contentType = response.headers.get('Content-Type');
            
            if (!response.ok) {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error.');
                } else {
                    throw new Error(`HTTP Error ${response.status}`);
                }
            }

            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return a valid JSON response.');
            }

            return response.json();
        })
        .then(async (data) => {
            if (!data.success || !data.url) {
                throw new Error(data.error || 'Server conversion failed.');
            }
            
            // Fetch the converted WebP blob from the server for zip packaging
            const fileResponse = await fetch(data.url);
            if (!fileResponse.ok) {
                throw new Error('Failed to retrieve the converted image from the server.');
            }
            const webpBlob = await fileResponse.blob();

            item.status = 'success';
            item.convertedSize = data.size;
            item.webpBlob = webpBlob;
            item.blob = data.url; // Direct server file URL
        })
        .catch((err) => {
            console.error(err);
            item.status = 'error';
            item.errorMsg = err.message || 'Server error';
            showToast(`PHP Server Error: ${item.errorMsg}`, 'error');
        })
        .finally(() => {
            activeConversions--;
            updateItemUI(item);
            updateSummary();
            processQueue();
        });
    }

    // Clear all files
    function clearQueue() {
        conversionQueue.forEach(item => {
            if (item.blob) {
                if (item.blob.startsWith('download.php?token=')) {
                    deleteFromServerSilently(item);
                } else {
                    URL.revokeObjectURL(item.blob);
                }
            }
        });
        conversionQueue = [];
        queueList.innerHTML = '';
        updateSummary();
        showToast('Queue cleared.', 'info');
    }

    // Download all converted files (ZIP or sequential)
    function downloadAll() {
        const successes = conversionQueue.filter(item => item.status === 'success');
        if (successes.length === 0) return;

        if (successes.length === 1) {
            // Only one file, download directly
            const item = successes[0];
            const a = document.createElement('a');
            a.href = item.blob;
            a.download = changeExtension(item.name, 'webp');
            a.click();
            return;
        }

        // Multiple files, packaging in ZIP if JSZip is loaded
        if (typeof JSZip !== 'undefined') {
            const zip = new JSZip();
            const usedNames = {};

            showToast('Packaging images into ZIP archive...', 'info');

            successes.forEach(item => {
                let name = changeExtension(item.name, 'webp');
                
                // Handle duplicate file names inside ZIP
                if (usedNames[name]) {
                    usedNames[name]++;
                    const extIndex = name.lastIndexOf('.');
                    name = name.substring(0, extIndex) + `_${usedNames[name]}` + name.substring(extIndex);
                } else {
                    usedNames[name] = 1;
                }

                zip.file(name, item.webpBlob);
            });

            zip.generateAsync({type: 'blob'})
            .then((zipBlob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(zipBlob);
                a.download = 'myimg_conversions.zip';
                a.click();
                URL.revokeObjectURL(a.href);
                showToast('ZIP archive downloaded!', 'success');
            });

        } else {
            // Fallback: download sequentially
            successes.forEach((item, index) => {
                setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = item.blob;
                    a.download = changeExtension(item.name, 'webp');
                    a.click();
                }, index * 250); // delay to prevent browser block
            });
            showToast('Downloading files sequentially...', 'info');
        }
    }

    /* --- Helper Functions --- */

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function changeExtension(filename, newExt) {
        return filename.substring(0, filename.lastIndexOf('.')) + '.' + newExt;
    }

    function deleteFromServer(item) {
        const el = document.getElementById(item.id);
        if (!el) return;
        
        const token = item.blob.split('token=')[1];
        if (!token) return;

        const serverDeleteBtn = el.querySelector('.item-server-delete-btn');
        serverDeleteBtn.disabled = true;

        fetch('delete.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: decodeURIComponent(token) })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete file from server.');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast('File deleted from server.', 'success');
                serverDeleteBtn.style.display = 'none';
                
                // Show a visual badge/status update
                const convertedSizeSpan = el.querySelector('.converted-size');
                convertedSizeSpan.innerHTML += ' <span style="opacity:0.6;font-size:0.75rem;">(Deleted from Server)</span>';
                convertedSizeSpan.style.color = 'var(--text-muted)';
                
                // Fallback: convert file to a local Blob URL so they can still download it client-side
                if (item.webpBlob) {
                    item.blob = URL.createObjectURL(item.webpBlob);
                }
            } else {
                throw new Error(data.error || 'Server error.');
            }
        })
        .catch(err => {
            console.error(err);
            showToast(`Error deleting file: ${err.message}`, 'error');
            serverDeleteBtn.disabled = false;
        });
    }

    function deleteFromServerSilently(item) {
        const token = item.blob.split('token=')[1];
        if (!token) return;
        fetch('delete.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: decodeURIComponent(token) })
        }).catch(err => console.warn('Silent delete failed:', err));
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') {
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        } else if (type === 'error') {
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        } else {
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }

        toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        // Auto remove toast
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    /* --- Footer Modal Dialogs --- */
    const infoModal = document.getElementById('info-modal');
    const modalContent = document.getElementById('modal-content-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const linkPrivacy = document.getElementById('link-privacy');
    const linkTerms = document.getElementById('link-terms');
    const linkSupport = document.getElementById('link-support');

    const modalData = {
        privacy: `
            <h3>Privacy Policy</h3>
            <p>At <strong>myimg.eu.cc</strong>, we prioritize the protection of your digital assets and personal privacy:</p>
            <ul>
                <li><strong>Client-Side Engine</strong>: When you process images locally, all compression operations take place inside your browser. No files are uploaded to any server.</li>
                <li><strong>PHP Server Engine</strong>: If you select PHP Server processing, images are securely uploaded to your local XAMPP server's disk space (in the <code>uploads/</code> folder) and processed in place.</li>
                <li><strong>Data Destruction</strong>: You remain in complete control of your data. Click the "Delete File from Server" trash button at any time to remove your files permanently. Clearing the queue or closing tabs triggers an automatic background deletion.</li>
            </ul>
        `,
        terms: `
            <h3>Terms of Use</h3>
            <p>By accessing and utilizing <strong>myimg.eu.cc</strong>, you agree to the following conditions:</p>
            <ul>
                <li><strong>Fair Usage</strong>: Our converter is free to use for both personal and professional image optimization.</li>
                <li><strong>As-Is Service</strong>: Conversions are provided as-is without any warranties of quality, uptime, or conversion accuracy.</li>
                <li><strong>Local Responsibility</strong>: If hosting a copy of myimg.eu.cc on a private XAMPP directory, you are responsible for monitoring disk limits and server access rules.</li>
            </ul>
        `,
        support: `
            <h3>Support Center</h3>
            <p>Need help or wish to submit feedback? Here is how to contact us:</p>
            <ul>
                <li><strong>Contact Channel</strong>: Send your questions or suggestions directly to our support inbox: <code>support@myimg.eu.cc</code>.</li>
            </ul>
        `
    };

    function openModal(key) {
        if (!modalData[key]) return;
        modalContent.innerHTML = modalData[key];
        infoModal.style.display = 'flex';
        // Allow rendering display flex first, then trigger opacity transition
        setTimeout(() => {
            infoModal.classList.add('active');
        }, 10);
    }

    function closeModal() {
        infoModal.classList.remove('active');
        setTimeout(() => {
            infoModal.style.display = 'none';
            modalContent.innerHTML = '';
        }, 300);
    }

    // Event Listeners for links
    linkPrivacy.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('privacy');
    });

    linkTerms.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('terms');
    });

    linkSupport.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('support');
    });

    // Close listeners
    modalCloseBtn.addEventListener('click', closeModal);
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && infoModal.classList.contains('active')) {
            closeModal();
        }
    });
});
