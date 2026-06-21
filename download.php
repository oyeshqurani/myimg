<?php
/**
 * Secure File Downloader for WebP Converter
 * Decrypts the secure token, validates that the file exists inside
 * the designated "uploads/" directory, and streams the WebP image to the user.
 */

// Encryption configuration (must match convert.php)
define('ENCRYPTION_KEY', 'towebp_secure_link_key_2026');
define('ENCRYPTION_METHOD', 'AES-256-CBC');

function decryptPath($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 2) return false;
    $iv = @hex2bin($parts[0]);
    $encrypted = @base64_decode($parts[1]);
    if ($iv === false || $encrypted === false) return false;
    return @openssl_decrypt($encrypted, ENCRYPTION_METHOD, ENCRYPTION_KEY, 0, $iv);
}

if (!isset($_GET['token'])) {
    http_response_code(400);
    echo "Error: Missing download token.";
    exit;
}

$token = $_GET['token'];
$filePath = decryptPath($token);

if ($filePath === false || empty($filePath)) {
    http_response_code(403);
    echo "Error: Invalid download token.";
    exit;
}

// Verify file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    echo "Error: Converted file has expired or was removed from the server.";
    exit;
}

// Secure check: Prevent directory traversal (verify path is within uploads directory)
$realPath = realpath($filePath);
$realUploadsDir = realpath('uploads/');

if ($realPath === false || $realUploadsDir === false || strpos($realPath, $realUploadsDir) !== 0) {
    http_response_code(403);
    echo "Error: Access denied. Unauthorized file download path.";
    exit;
}

// Get clean filename
$cleanName = basename($filePath);

// Send headers to download WebP file
header('Content-Description: File Transfer');
header('Content-Type: image/webp');
header('Content-Disposition: attachment; filename="' . $cleanName . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($filePath));

// Clear output buffers
while (ob_get_level()) {
    ob_end_clean();
}

readfile($filePath);
exit;
