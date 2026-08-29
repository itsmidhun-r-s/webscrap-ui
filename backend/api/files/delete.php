<?php
require_once __DIR__ . '/../config/database.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input && isset($_POST['file_id'])) {
        $input = $_POST;
    }
    if (!$input && isset($_GET['file_id'])) {
        $input = ['file_id' => $_GET['file_id']];
    }
    
    if (!isset($input['file_id'])) {
        throw new Exception('File ID is required');
    }
    
    $fileId = (int)$input['file_id'];
    
    $stmt = $conn->prepare("SELECT file_path, filename FROM uploaded_files WHERE id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('File not found in database');
    }
    
    $row = $result->fetch_assoc();
    $filePath = $row['file_path'];
    $stmt->close();
    
    $conn->begin_transaction();
    
    // Delete extracted records first
    $stmt = $conn->prepare("DELETE FROM extracted_data WHERE file_id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $stmt->close();
    
    // Delete uploaded_files record
    $stmt = $conn->prepare("DELETE FROM uploaded_files WHERE id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $stmt->close();
    
    // Delete physical file
    if (file_exists($filePath)) {
        @unlink($filePath);
    }
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'File and associated database records deleted successfully'
    ]);
    
} catch (Exception $e) {
    if (isset($conn) && $conn) {
        $conn->rollback();
    }
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