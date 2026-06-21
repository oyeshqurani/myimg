<?php
/**
 * Secure File Deletion Endpoint for WebP Converter
 * Accepts a POST request with the file's secure token, decrypts it,
 * validates that the file resides in the "uploads/" folder,
 * and deletes the file from the server's disk.
 */

// Encryption configuration (must match convert.php and download.php)
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

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST requests are allowed.']);
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);
$token = isset($input['token']) ? $input['token'] : '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing file token.']);
    exit;
}

$filePath = decryptPath($token);

if ($filePath === false || empty($filePath)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid file token.']);
    exit;
}

// Secure check: Verify file resides strictly within the uploads directory
$realPath = realpath($filePath);
$realUploadsDir = realpath('uploads/');

if ($realPath === false || $realUploadsDir === false || strpos($realPath, $realUploadsDir) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Unauthorized file deletion path.']);
    exit;
}

// Attempt file deletion
if (file_exists($realPath)) {
    if (unlink($realPath)) {
        echo json_encode(['success' => true, 'message' => 'File deleted from server successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete file from server.']);
    }
} else {
    // If file doesn't exist anymore, treat as success
    echo json_encode(['success' => true, 'message' => 'File already deleted.']);
}
exit;
