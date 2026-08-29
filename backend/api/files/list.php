<?php
require_once __DIR__ . '/../config/database.php';

try {
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $fileId = isset($_GET['file_id']) ? (int)$_GET['file_id'] : null;
    $includeData = isset($_GET['include_data']) ? (bool)$_GET['include_data'] : true;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    $sql = "SELECT id, filename, original_filename, file_size, file_path, uploaded_by, record_count, status, created_at, updated_at 
            FROM uploaded_files";
    
    $conditions = [];
    if ($status) {
        $conditions[] = "status = '" . $conn->real_escape_string($status) . "'";
    }
    if ($fileId) {
        $conditions[] = "id = " . $fileId;
    }
    
    if (count($conditions) > 0) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception('Database query failed: ' . $conn->error);
    }
    
    $files = [];
    while ($row = $result->fetch_assoc()) {
        $fId = (int)$row['id'];
        $extractedRecords = [];
        
        if ($includeData) {
            $dataSql = "SELECT name, phone, email, domain, city, state FROM extracted_data WHERE file_id = $fId";
            $dataRes = $conn->query($dataSql);
            if ($dataRes) {
                while ($dRow = $dataRes->fetch_assoc()) {
                    $extractedRecords[] = [
                        'name' => $dRow['name'],
                        'phone' => $dRow['phone'],
                        'email' => $dRow['email'],
                        'domain' => $dRow['domain'],
                        'city' => $dRow['city'],
                        'state' => $dRow['state'],
                        'sourceFile' => $row['original_filename']
                    ];
                }
            }
        }
        
        $files[] = [
            'id' => (string)$fId,
            'filename' => $row['original_filename'],
            'stored_filename' => $row['filename'],
            'file_size' => (int)$row['file_size'],
            'file_size_formatted' => formatFileSize($row['file_size']),
            'uploaded_by' => $row['uploaded_by'],
            'uploadedAt' => $row['created_at'],
            'recordCount' => (int)$row['record_count'],
            'status' => $row['status'],
            'data' => $extractedRecords,
            'stats' => [
                'total' => count($extractedRecords),
                'names' => count(array_filter($extractedRecords, function($r) { return $r['name'] && $r['name'] !== 'Unknown'; })),
                'phones' => count(array_filter($extractedRecords, function($r) { return $r['phone'] && $r['phone'] !== 'N/A'; })),
                'validEmails' => count($extractedRecords),
                'skipped' => 0,
                'duplicates' => 0
            ]
        ];
    }
    
    $countSql = "SELECT COUNT(*) as total FROM uploaded_files";
    if (count($conditions) > 0) {
        $countSql .= " WHERE " . implode(" AND ", $conditions);
    }
    $countResult = $conn->query($countSql);
    $totalRow = $countResult ? $countResult->fetch_assoc() : ['total' => 0];
    
    echo json_encode([
        'success' => true,
        'files' => $files,
        'count' => count($files),
        'total' => (int)$totalRow['total']
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
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