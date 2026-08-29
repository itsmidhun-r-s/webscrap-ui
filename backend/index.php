<?php
header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'message' => 'DataExtract Team API is running!',
    'version' => '3.0',
    'endpoints' => [
        'files' => [
            'upload' => '/api/files/upload.php',
            'list' => '/api/files/list.php',
            'delete' => '/api/files/delete.php',
            'download' => '/api/files/download.php'
        ],
        'extract' => [
            'extract' => '/api/extract/extract.php',
            'export' => '/api/extract/export.php'
        ]
    ]
]);
?>