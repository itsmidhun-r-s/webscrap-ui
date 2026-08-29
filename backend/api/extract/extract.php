<?php
require_once __DIR__ . '/../config/database.php';

try {
    // Get input data
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    if (!$input && isset($_POST['file_id'])) {
        $input = $_POST;
    }
    
    if (!isset($input['file_id'])) {
        throw new Exception('File ID is required');
    }
    
    $fileId = (int)$input['file_id'];
    $extractedBy = isset($input['extracted_by']) ? trim($input['extracted_by']) : 'Team Member';
    
    // Get file information from uploaded_files table
    $stmt = $conn->prepare("SELECT file_path, original_filename FROM uploaded_files WHERE id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('File not found in database');
    }
    
    $file = $result->fetch_assoc();
    $stmt->close();
    $filePath = $file['file_path'];
    
    // Update status to processing
    $stmt = $conn->prepare("UPDATE uploaded_files SET status = 'processing' WHERE id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $stmt->close();
    
    $extractedData = [];
    
    // Case 1: Extracted data provided from frontend (SheetJS parsed data)
    if (isset($input['extracted_data']) && is_array($input['extracted_data']) && count($input['extracted_data']) > 0) {
        $originalFilename = isset($file['original_filename']) ? $file['original_filename'] : '';
        foreach ($input['extracted_data'] as $row) {
            $email = isset($row['email']) ? trim($row['email']) : '';
            if (empty($email)) continue;
            
            $rawCity = isset($row['city']) ? trim($row['city']) : '';
            $rawState = isset($row['state']) ? trim($row['state']) : '';
            
            $city = formatCityName($rawCity);
            $state = normalizeStateCode($rawState, $rawCity, $originalFilename);
            
            $extractedData[] = [
                'name' => isset($row['name']) && !empty($row['name']) ? trim($row['name']) : 'Unknown',
                'phone' => isset($row['phone']) && !empty($row['phone']) ? trim($row['phone']) : 'N/A',
                'email' => $email,
                'domain' => isset($row['domain']) && !empty($row['domain']) ? trim($row['domain']) : getEmailDomain($email),
                'city' => !empty($city) ? $city : $rawCity,
                'state' => !empty($state) ? $state : strtoupper($rawState)
            ];
        }
    } 
    // Case 2: Server-side file reading fallback (CSV or PhpSpreadsheet if available)
    else if (file_exists($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        
        if ($ext === 'csv') {
            if (($handle = fopen($filePath, "r")) !== FALSE) {
                $header = fgetcsv($handle, 1000, ",");
                while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                    $rowStr = implode(' ', $data);
                    preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $rowStr, $emailMatches);
                    if (!empty($emailMatches[0])) {
                        $email = $emailMatches[0];
                        $extractedData[] = [
                            'name' => isset($data[0]) ? trim($data[0]) : 'Unknown',
                            'phone' => isset($data[1]) ? trim($data[1]) : 'N/A',
                            'email' => $email,
                            'domain' => getEmailDomain($email),
                            'city' => isset($data[4]) ? trim($data[4]) : '',
                            'state' => isset($data[5]) ? trim($data[5]) : ''
                        ];
                    }
                }
                fclose($handle);
            }
        }
        // If PhpSpreadsheet vendor exists
        else if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
            require_once __DIR__ . '/../../vendor/autoload.php';
            try {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray();
                
                foreach ($rows as $row) {
                    $rowStr = implode(' ', array_map(function($v) { return is_string($v) ? $v : ''; }, $row));
                    preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $rowStr, $emailMatches);
                    if (!empty($emailMatches[0])) {
                        $email = $emailMatches[0];
                        $extractedData[] = [
                            'name' => isset($row[0]) ? trim($row[0]) : 'Unknown',
                            'phone' => isset($row[1]) ? trim($row[1]) : 'N/A',
                            'email' => $email,
                            'domain' => getEmailDomain($email),
                            'city' => isset($row[4]) ? trim($row[4]) : '',
                            'state' => isset($row[5]) ? trim($row[5]) : ''
                        ];
                    }
                }
            } catch (Exception $ex) {
                logError("PhpSpreadsheet reading error: " . $ex->getMessage());
            }
        }
    }
    
    // Clear previous extracted data for this file
    $stmt = $conn->prepare("DELETE FROM extracted_data WHERE file_id = ?");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $stmt->close();
    
    // Save extracted data to database
    $savedCount = 0;
    if (!empty($extractedData)) {
        $stmt = $conn->prepare("INSERT INTO extracted_data (file_id, name, phone, email, domain, city, state, extracted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($extractedData as $data) {
            $stmt->bind_param(
                "isssssss", 
                $fileId, 
                $data['name'], 
                $data['phone'], 
                $data['email'], 
                $data['domain'], 
                $data['city'], 
                $data['state'], 
                $extractedBy
            );
            if ($stmt->execute()) {
                $savedCount++;
            }
        }
        $stmt->close();
    }
    
    // Update file status to completed
    $stmt = $conn->prepare("UPDATE uploaded_files SET status = 'completed', record_count = ? WHERE id = ?");
    $stmt->bind_param("ii", $savedCount, $fileId);
    $stmt->execute();
    $stmt->close();
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully extracted and saved $savedCount records to database",
        'data' => $extractedData,
        'record_count' => $savedCount,
        'file_id' => $fileId,
        'extracted_by' => $extractedBy
    ]);
    
} catch (Exception $e) {
    if (isset($conn) && $conn && isset($fileId)) {
        $stmt = $conn->prepare("UPDATE uploaded_files SET status = 'failed' WHERE id = ?");
        $stmt->bind_param("i", $fileId);
        $stmt->execute();
        $stmt->close();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Extraction failed: ' . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
?>