<?php
require_once __DIR__ . '/../config/database.php';

try {
    if (!isset($_GET['file_id'])) {
        throw new Exception('File ID is required');
    }
    
    $fileId = (int)$_GET['file_id'];
    $format = isset($_GET['format']) ? $_GET['format'] : 'csv';
    
    $stmt = $conn->prepare("SELECT name, phone, email, domain, city, state FROM extracted_data WHERE file_id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    $stmt->close();
    
    if (empty($data)) {
        throw new Exception('No extracted data found in database for this file');
    }
    
    if ($format === 'csv') {
        $filename = 'extracted_data_' . date('Ymd_His') . '.csv';
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        fputcsv($output, ['Name', 'Phone', 'Email', 'Domain', 'City', 'State']);
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
        fclose($output);
        exit();
    } else {
        $filename = 'extracted_data_' . date('Ymd_His') . '.xls';
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        echo "Name\tPhone\tEmail\tDomain\tCity\tState\n";
        foreach ($data as $row) {
            echo implode("\t", $row) . "\n";
        }
        exit();
    }
    
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