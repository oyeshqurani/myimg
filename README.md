# myimg.eu.cc - Secure & Private Image to WebP Converter

`myimg.eu.cc` is a premium, lightweight, and high-fidelity image-to-WebP optimization tool. It is designed to run entirely client-side inside the browser or utilizing a secure server-side PHP backup engine (compatible with standard XAMPP environments).

## 🚀 Key Features

*   **⚡ Client-Side Conversion (Default)**: Leverages HTML5 Canvas to perform instant image re-encoding locally in the browser tab. Your files never leave your computer, ensuring complete privacy, zero upload latency, and bypass of server file-size limits.
*   **💾 PHP Server Engine Fallback**: Integrates a robust PHP GD graphics processor to handle uploads on Apache backends, saving converted images physically inside a local `uploads/` directory.
*   **🔒 AES-256-CBC Download Obfuscation**: Obfuscates server-side storage paths behind dynamically generated secure tokens. Converted files are securely fetched and streamed via `download.php`, preventing path traversal and file harvesting vulnerabilities.
*   **🗑️ On-Demand Server Deletion**: Allows users to instantly delete their processed files from the server's disk using a dedicated trash button. Deleting individual cards or clearing the queue triggers background requests to cleanly purge server files.
*   **⚖️ Smart Target-Size Optimizer**: A progressive binary search algorithm that automatically compresses quality (down to 40%) and resizes dimensions (down to 15%) to fit files under a user-defined limit (e.g., 100KB) with minimal visual impact.
*   **🎨 Premium Glassmorphism UI**: High-end light theme built with slate text and violet/sky-blue glow accents. Optimized with visual step guides for beginners and responsive styling for mobile touch targets.
*   **📦 Bulk ZIP Export**: Compiles multiple converted images into a single ZIP archive locally using JSZip.

---

## 🛠️ Local Installation & Setup

To host this repository locally using XAMPP (Apache):

1.  **Clone the Repository**:
    Clone the codebase into your XAMPP's web directory:
    ```bash
    git clone https://github.com/oyeshqurani/myimg.git c:/xampp/htdocs/towebp
    ```
2.  **Enable PHP GD Module**:
    Ensure the GD graphics library extension is enabled in your server configuration:
    - Open `php.ini`.
    - Find and uncomment the line: `extension=gd`.
    - Restart Apache.
3.  **Run the App**:
    Open your browser and navigate to:
    ```
    http://localhost/towebp/
    ```

---

## 📁 File Structure

*   `index.php` — Main entry point containing UI elements, step banners, and footer modals.
*   `convert.php` — Server-side image processor with GD scaling and quality optimizers.
*   `download.php` — Secure gateway decrypting file tokens and streaming attachments.
*   `delete.php` — Secure unlinking controller to remove files from the server's disk.
*   `assets/css/style.css` — Modern glassmorphism Light Mode theme and responsive styling.
*   `assets/js/app.js` — Client-side canvas compression, target search loops, JSZip builders, and modal event bindings.
*   `assets/js/jszip.min.js` — Local library enabling offline ZIP folder packaging.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
