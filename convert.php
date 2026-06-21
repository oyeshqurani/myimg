<?php
/**
 * Server-side Image to WebP Converter API
 * Accepts POST request with an image file and quality parameters,
 * saves the converted WebP image on the server in the "uploads/" folder,
 * and returns JSON containing the file's URL and size metadata.
 */

// Enable error reporting but prevent output buffering from corrupting JSON responses
error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Encryption configuration (must match download.php)
define('ENCRYPTION_KEY', 'towebp_secure_link_key_2026');
define('ENCRYPTION_METHOD', 'AES-256-CBC');

function encryptPath($path) {
    $iv_length = openssl_cipher_iv_length(ENCRYPTION_METHOD);
    $iv = openssl_random_pseudo_bytes($iv_length);
    $encrypted = openssl_encrypt($path, ENCRYPTION_METHOD, ENCRYPTION_KEY, 0, $iv);
    // Return base64 URL safe string combining encrypted data and IV
    return bin2hex($iv) . '.' . base64_encode($encrypted);
}

function sendError($message, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Only POST requests are allowed.', 405);
}

if (!isset($_FILES['image'])) {
    sendError('No image file uploaded. Please upload a file with key "image".');
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    sendError('File upload error code: ' . $file['error']);
}

// Get compression quality (default 80, range 1-100)
$quality = isset($_POST['quality']) ? intval($_POST['quality']) : 80;
if ($quality < 1 || $quality > 100) {
    $quality = 80;
}

// Verify GD extension is loaded
if (!extension_loaded('gd')) {
    sendError('PHP GD extension is not enabled on this server. Please use client-side conversion.', 500);
}

// Load the image
$imagePath = $file['tmp_name'];
$imageInfo = getimagesize($imagePath);

if ($imageInfo === false) {
    sendError('Uploaded file is not a valid image.');
}

$mimeType = $imageInfo['mime'];
$img = null;

switch ($mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
        $img = @imagecreatefromjpeg($imagePath);
        break;
    case 'image/png':
        $img = @imagecreatefrompng($imagePath);
        if ($img) {
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }
        break;
    case 'image/gif':
        $img = @imagecreatefromgif($imagePath);
        if ($img) {
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }
        break;
    case 'image/webp':
        $img = @imagecreatefromwebp($imagePath);
        if ($img) {
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }
        break;
    case 'image/bmp':
    case 'image/x-ms-bmp':
        $img = @imagecreatefrombmp($imagePath);
        break;
    default:
        // Try loading generic image from string if format is not standard
        $imgData = file_get_contents($imagePath);
        $img = @imagecreatefromstring($imgData);
        if ($img) {
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }
        break;
}

if (!$img) {
    sendError('Failed to process image. Unsupported or corrupted file format.');
}

// Create uploads directory if it doesn't exist
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        sendError('Failed to create upload directory on the server.', 500);
    }
}

// Generate a sanitized unique filename for the converted WebP image
$originalName = pathinfo($file['name'], PATHINFO_FILENAME);
$safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $originalName);
if (empty($safeName)) {
    $safeName = 'image';
}
$filename = $safeName . '_' . uniqid() . '.webp';
$savePath = $uploadDir . $filename;

// Target-size optimization server-side
$targetSizeKb = isset($_POST['targetSize']) ? intval($_POST['targetSize']) : 0;
if ($targetSizeKb > 0) {
    $targetBytes = $targetSizeKb * 1024;
    
    // Start with requested quality, and decrease if it's too large
    $optQuality = $quality;
    $success = false;
    $data = '';
    
    while ($optQuality >= 30) {
        ob_start();
        imagewebp($img, null, $optQuality);
        $data = ob_get_clean();
        $size = strlen($data);
        
        if ($size <= $targetBytes || $optQuality === 30) {
            $success = true;
            break;
        }
        
        $optQuality -= 10; // reduce quality by 10% steps
    }
    
    // If it's still too large, let's downscale the image
    if ($success && strlen($data) > $targetBytes) {
        $width = imagesx($img);
        $height = imagesy($img);
        $scale = 0.9;
        
        while ($scale >= 0.4) {
            $newWidth = round($width * $scale);
            $newHeight = round($height * $scale);
            
            $resizedImg = imagecreatetruecolor($newWidth, $newHeight);
            imagealphablending($resizedImg, false);
            imagesavealpha($resizedImg, true);
            
            imagecopyresampled($resizedImg, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            
            ob_start();
            imagewebp($resizedImg, null, 50); // use a conservative quality for downscaled
            $data = ob_get_clean();
            imagedestroy($resizedImg);
            
            if (strlen($data) <= $targetBytes) {
                break;
            }
            $scale -= 0.15;
        }
    }
    
    imagedestroy($img);
    
    // Save optimized image data to server
    if (file_put_contents($savePath, $data) === false) {
        sendError('Failed to save the optimized WebP file on the server.', 500);
    }
} else {
    // Standard compression directly to file
    if (imagewebp($img, $savePath, $quality) === false) {
        imagedestroy($img);
        sendError('Failed to save the WebP file on the server.', 500);
    }
    imagedestroy($img);
}

// Return JSON metadata instead of binary content
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'url' => 'download.php?token=' . urlencode(encryptPath($savePath)),
    'size' => filesize($savePath),
    'name' => $filename
]);
exit;
