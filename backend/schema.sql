-- MySQL Database Schema for DataExtract Web Scraping UI
-- Database: dataextract-excel

CREATE DATABASE IF NOT EXISTS `dataextract-excel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dataextract-excel`;

-- Table structure for uploaded files
CREATE TABLE IF NOT EXISTS `uploaded_files` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for extracted contact records
CREATE TABLE IF NOT EXISTS `extracted_data` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
