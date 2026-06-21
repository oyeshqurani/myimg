<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>myimg.eu.cc | Fast & Private Image WebP Converter</title>
    <meta name="description" content="Convert your images to highly optimized WebP format instantly. Zero quality loss, offline compression, and smart file size optimization under myimg.eu.cc.">
    
    <!-- Premium Fonts and Styling -->
    <link rel="stylesheet" href="assets/css/style.css">
    
    <!-- Local JSZip for client-side ZIP creation -->
    <script src="assets/js/jszip.min.js"></script>
</head>
<body>

    <!-- Header Navigation -->
    <header>
        <a href="#" class="logo">
            <!-- Sleek SVG Logo -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>myimg.eu.cc</span>
        </a>
    </header>

    <!-- Main Workspace -->
    <main>
        
        <!-- Sidebar Settings Panel -->
        <section class="sidebar glass-panel">
            <h2 class="panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Settings
            </h2>

            <!-- Conversion Mode Selector -->
            <div class="setting-group">
                <label class="setting-label">Conversion Mode</label>
                <div class="mode-tabs">
                    <button class="mode-tab active" data-mode="client">Client-Side</button>
                    <button class="mode-tab" data-mode="server">PHP Server</button>
                </div>
            </div>

            <!-- Quality Control -->
            <div class="setting-group">
                <div class="setting-label">
                    <span>Target Quality</span>
                    <span class="setting-value" id="quality-value">85%</span>
                </div>
                <input type="range" id="quality-slider" min="10" max="100" value="85">
            </div>

            <!-- Size Constraint Switch -->
            <div class="setting-group">
                <div class="switch-container">
                    <div class="switch-info">
                        <span class="switch-title">Smart Size Optimization</span>
                        <span class="switch-desc">Fits output under target file size</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="size-limit-toggle" checked>
                        <span class="slider"></span>
                    </label>
                </div>

                <!-- Custom Size Target Input -->
                <div class="target-size-container visible" id="target-size-container">
                    <div class="setting-label">
                        <span>Max File Size</span>
                    </div>
                    <div class="input-with-badge">
                        <input type="number" id="target-size-input" value="100" min="5" max="5000">
                        <span class="badge">KB</span>
                    </div>
                </div>
            </div>

        </section>

        <!-- Dropzone and Result List -->
        <section class="dropzone-container">

            <!-- Premium 3-Step Guide Banner -->
            <div class="step-guide glass-panel">
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-text">
                        <h4>Add Files</h4>
                        <p>Drag images or click browse</p>
                    </div>
                </div>
                <div class="step-arrow">&rarr;</div>
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-text">
                        <h4>Set Output</h4>
                        <p>Settings are auto-configured</p>
                    </div>
                </div>
                <div class="step-arrow">&rarr;</div>
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-text">
                        <h4>Save WebP</h4>
                        <p>Click download or save ZIP</p>
                    </div>
                </div>
            </div>
            
            <!-- Drag & Drop Zone -->
            <div class="dropzone glass-panel" id="dropzone">
                <div class="dropzone-content">
                    <div class="upload-icon-wrapper">
                        <!-- Upload Cloud SVG -->
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    </div>
                    <div class="dropzone-text">
                        <h3>Drag & drop images here</h3>
                        <p>Supports PNG, JPG, GIF, AVIF, WEBP and BMP</p>
                    </div>
                    <button class="browse-btn">Browse Files</button>
                    <!-- Hidden File Input -->
                    <input type="file" id="file-input" multiple accept="image/*" style="display: none;">
                </div>
            </div>

            <!-- Global Controls & Status Bar -->
            <div class="controls-bar">
                <div class="queue-summary">
                    <span id="queue-count">0/0 Converted</span>
                    <span style="margin: 0 0.5rem; opacity: 0.3;">|</span>
                    <span id="queue-size" style="font-weight: 500;">Queue size: 0 KB</span>
                </div>
                <div class="actions-group">
                    <button class="btn btn-secondary" id="clear-queue-btn" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Clear
                    </button>
                    <button class="btn btn-success" id="download-all-btn" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download ZIP
                    </button>
                </div>
            </div>

            <!-- Conversion Queue List -->
            <div class="queue-list" id="queue-list">
                <!-- Converted items injected dynamically via JS -->
            </div>

        </section>

    </main>

    <!-- Footer -->
    <footer>
        <div class="footer-links">
            <a href="#" id="link-privacy">Privacy Policy</a>
            <a href="#" id="link-terms">Terms of Use</a>
            <a href="#" id="link-support">Support</a>
        </div>
        <p>&copy; 2026 myimg.eu.cc. All rights reserved.</p>
    </footer>

    <!-- Info Modal Dialog -->
    <div class="modal-overlay" id="info-modal" style="display: none;">
        <div class="modal-card">
            <button class="modal-close-btn" id="modal-close-btn">&times;</button>
            <div class="modal-content" id="modal-content-body">
                <!-- Content injected dynamically via JS -->
            </div>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div class="toast-container" id="toast-container"></div>

    <!-- Application Script -->
    <script src="assets/js/app.js"></script>
</body>
</html>
