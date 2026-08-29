<?php
require_once __DIR__ . '/../config/database.php';

try {
    if (!isset($_GET['file_id'])) {
        throw new Exception('File ID is required');
    }
    
    $fileId = (int)$_GET['file_id'];
    
    $stmt = $conn->prepare("SELECT original_filename, file_path FROM uploaded_files WHERE id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('File not found in database');
    }
    
    $row = $result->fetch_assoc();
    $filePath = $row['file_path'];
    $filename = $row['original_filename'];
    $stmt->close();
    
    if (!file_exists($filePath)) {
        throw new Exception('Physical file not found on server');
    }
    
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache');
    
    readfile($filePath);
    exit();
    
} catch (Exception $e) {
    http_response_code(404);
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