<?php
require_once __DIR__ . '/../config/database.php';

try {
    // Ensure upload directory exists
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0777, true);
    }

    // Get uploader name
    $uploadedBy = isset($_POST['uploaded_by']) ? trim($_POST['uploaded_by']) : 'Team Member';
    
    // Check if file was uploaded
    if (!isset($_FILES['excel_file']) || $_FILES['excel_file']['error'] !== UPLOAD_ERR_OK) {
        $error_message = 'No file uploaded';
        if (isset($_FILES['excel_file']['error'])) {
            switch ($_FILES['excel_file']['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    $error_message = 'File exceeds maximum allowed size';
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $error_message = 'File was only partially uploaded';
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $error_message = 'No file was selected';
                    break;
                default:
                    $error_message = 'Upload error occurred';
            }
        }
        throw new Exception($error_message);
    }
    
    $file = $_FILES['excel_file'];
    $originalFilename = $file['name'];
    $fileSize = $file['size'];
    $fileTmpPath = $file['tmp_name'];
    
    // Validate file size
    if ($fileSize > MAX_FILE_SIZE) {
        throw new Exception('File size exceeds maximum allowed size of ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB');
    }
    
    // Validate file extension
    $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
    if (!in_array($extension, ALLOWED_EXTENSIONS)) {
        throw new Exception('Only ' . implode(', ', ALLOWED_EXTENSIONS) . ' files are allowed');
    }
    
    // Generate unique filename
    $timestamp = date('Ymd_His');
    $random = substr(md5(uniqid()), 0, 6);
    $newFilename = pathinfo($originalFilename, PATHINFO_FILENAME) . '_' . $timestamp . '_' . $random . '.' . $extension;
    $filePath = UPLOAD_DIR . $newFilename;
    
    // Move uploaded file
    if (!move_uploaded_file($fileTmpPath, $filePath)) {
        throw new Exception('Failed to save file. Please check directory permissions.');
    }
    
    // Save file record to database
    $stmt = $conn->prepare("INSERT INTO uploaded_files (filename, original_filename, file_size, file_path, uploaded_by, status) VALUES (?, ?, ?, ?, ?, 'pending')");
    $stmt->bind_param("ssiss", $newFilename, $originalFilename, $fileSize, $filePath, $uploadedBy);
    
    if (!$stmt->execute()) {
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        throw new Exception('Failed to save file information to database: ' . $stmt->error);
    }
    
    $fileId = $conn->insert_id;
    $stmt->close();
    
    // Return success response with file ID
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded and saved to database successfully',
        'file' => [
            'id' => $fileId,
            'filename' => $originalFilename,
            'stored_filename' => $newFilename,
            'file_size' => $fileSize,
            'file_size_formatted' => formatFileSize($fileSize),
            'uploaded_by' => $uploadedBy,
            'created_at' => date('Y-m-d H:i:s'),
            'status' => 'pending'
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
?>