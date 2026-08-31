<?php
// Production & Local Database configuration with Auto-Provisioning & Migrations
ini_set('display_errors', '0');
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_OFF);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/../utils/helpers.php';

// Parse .env file if available
$envFile = __DIR__ . '/../../.env';
$envVars = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0 || empty($line)) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $envVars[trim($key)] = trim($val);
        }
    }
}

// Database configuration
$host = isset($envVars['DB_HOST']) ? $envVars['DB_HOST'] : 'localhost';
$username = isset($envVars['DB_USERNAME']) ? $envVars['DB_USERNAME'] : 'thekidsw_webscrap';
$password = isset($envVars['DB_PASSWORD']) ? $envVars['DB_PASSWORD'] : '';
$database = isset($envVars['DB_DATABASE']) ? $envVars['DB_DATABASE'] : 'thekidsw_webscrap';

// Connect to MySQL server with Exception Safety
try {
    $conn = @new mysqli($host, $username, $password);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database server connection failed: ' . $conn->connect_error . '. Please start MySQL service on port 3306.'
        ]);
        exit();
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection exception: ' . $e->getMessage() . '. Please ensure MySQL server (e.g. XAMPP/WAMP) is running.'
    ]);
    exit();
}

// Ensure database exists
try {
    $conn->query("CREATE DATABASE IF NOT EXISTS `$database` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    if (!$conn->select_db($database)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to select database ' . $database . ': ' . $conn->error
        ]);
        exit();
    }

    $conn->set_charset("utf8mb4");

    // Auto-provision tables if they do not exist
    $createUploadedFiles = "CREATE TABLE IF NOT EXISTS `uploaded_files` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `filename` VARCHAR(255) NOT NULL,
      `original_filename` VARCHAR(255) NOT NULL,
      `file_size` BIGINT NOT NULL,
      `file_path` VARCHAR(500) NOT NULL,
      `uploaded_by` VARCHAR(100) DEFAULT 'Team Member',
      `record_count` INT DEFAULT 0,
      `status` ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
      `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $createExtractedData = "CREATE TABLE IF NOT EXISTS `extracted_data` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `file_id` INT NOT NULL,
      `name` VARCHAR(255) DEFAULT 'Unknown',
      `phone` VARCHAR(100) DEFAULT 'N/A',
      `email` VARCHAR(255) NOT NULL,
      `domain` VARCHAR(100) DEFAULT '',
      `city` VARCHAR(100) DEFAULT '',
      `state` VARCHAR(100) DEFAULT '',
      `extracted_by` VARCHAR(100) DEFAULT 'Team Member',
      `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (`file_id`) REFERENCES `uploaded_files`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $conn->query($createUploadedFiles);
    $conn->query($createExtractedData);

    // Auto-migrate missing columns if table already existed without them
    $checkCity = $conn->query("SHOW COLUMNS FROM `extracted_data` LIKE 'city'");
    if ($checkCity && $checkCity->num_rows === 0) {
        $conn->query("ALTER TABLE `extracted_data` ADD COLUMN `city` VARCHAR(100) DEFAULT '' AFTER `domain`");
    }

    $checkState = $conn->query("SHOW COLUMNS FROM `extracted_data` LIKE 'state'");
    if ($checkState && $checkState->num_rows === 0) {
        $conn->query("ALTER TABLE `extracted_data` ADD COLUMN `state` VARCHAR(100) DEFAULT '' AFTER `city`");
    }
} catch (Throwable $dbEx) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database setup error: ' . $dbEx->getMessage()
    ]);
    exit();
}
?>