<?php
require_once __DIR__ . '/../config/constants.php';

/**
 * Format file size from bytes to human readable format
 */
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' B';
    }
}

/**
 * Generate a unique filename
 */
function generateUniqueFilename($originalFilename) {
    $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
    $basename = pathinfo($originalFilename, PATHINFO_FILENAME);
    $timestamp = date('Ymd_His');
    $random = substr(md5(uniqid()), 0, 8);
    return $basename . '_' . $timestamp . '_' . $random . '.' . $extension;
}

/**
 * Validate email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Get email domain
 */
function getEmailDomain($email) {
    if (!isValidEmail($email)) return '';
    $parts = explode('@', $email);
    return strtolower($parts[1]);
}

/**
 * Format city name (e.g. "new-york" -> "New York")
 */
function formatCityName($city) {
    if (empty($city)) return '';
    $cleaned = trim(preg_replace('/[-_]+/', ' ', $city));
    return ucwords(strtolower($cleaned));
}

/**
 * Normalize state or country code (e.g. "New York" -> "NY", "Florida" -> "FL", "Maryland" -> "MD")
 */
function normalizeStateCode($rawState = '', $city = '', $filename = '') {
    $validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
        'DC', 'PR', 'VI', 'GU', 'MP', 'AS'
    ];

    $stateMap = [
        'ALABAMA' => 'AL', 'ALASKA' => 'AK', 'ARIZONA' => 'AZ', 'ARKANSAS' => 'AR', 'CALIFORNIA' => 'CA',
        'COLORADO' => 'CO', 'CONNECTICUT' => 'CT', 'DELAWARE' => 'DE', 'FLORIDA' => 'FL', 'GEORGIA' => 'GA',
        'HAWAII' => 'HI', 'IDAHO' => 'ID', 'ILLINOIS' => 'IL', 'INDIANA' => 'IN', 'IOWA' => 'IA',
        'KANSAS' => 'KS', 'KENTUCKY' => 'KY', 'LOUISIANA' => 'LA', 'MAINE' => 'ME', 'MARYLAND' => 'MD',
        'MASSACHUSETTS' => 'MA', 'MICHIGAN' => 'MI', 'MINNESOTA' => 'MN', 'MISSISSIPPI' => 'MS', 'MISSOURI' => 'MO',
        'MONTANA' => 'MT', 'NEBRASKA' => 'NE', 'NEVADA' => 'NV', 'NEW HAMPSHIRE' => 'NH', 'NEW JERSEY' => 'NJ',
        'NEW MEXICO' => 'NM', 'NEW YORK' => 'NY', 'NORTH CAROLINA' => 'NC', 'NORTH DAKOTA' => 'ND', 'OHIO' => 'OH',
        'OKLAHOMA' => 'OK', 'OREGON' => 'OR', 'PENNSYLVANIA' => 'PA', 'RHODE ISLAND' => 'RI', 'SOUTH CAROLINA' => 'SC',
        'SOUTH DAKOTA' => 'SD', 'TENNESSEE' => 'TN', 'TEXAS' => 'TX', 'UTAH' => 'UT', 'VERMONT' => 'VT',
        'VIRGINIA' => 'VA', 'WASHINGTON' => 'WA', 'WEST VIRGINIA' => 'WV', 'WISCONSIN' => 'WI', 'WYOMING' => 'WY'
    ];

    $cityMap = [
        'new-york' => 'NY', 'new york' => 'NY', 'nyc' => 'NY', 'brooklyn' => 'NY', 'queens' => 'NY', 'bronx' => 'NY', 'manhattan' => 'NY', 'albany' => 'NY', 'buffalo' => 'NY',
        'miami' => 'FL', 'orlando' => 'FL', 'tampa' => 'FL', 'jacksonville' => 'FL', 'fort lauderdale' => 'FL',
        'baltimore' => 'MD', 'annapolis' => 'MD', 'bethesda' => 'MD',
        'chicago' => 'IL', 'los angeles' => 'CA', 'san francisco' => 'CA', 'san diego' => 'CA', 'houston' => 'TX', 'dallas' => 'TX'
    ];

    if (!empty($rawState)) {
        $s = strtoupper(trim($rawState));
        if (in_array($s, $validStates)) return $s;
        if (isset($stateMap[$s])) return $stateMap[$s];
    }

    if (!empty($city)) {
        $c = strtolower(trim($city));
        if (isset($cityMap[$c])) return $cityMap[$c];
        $cCleaned = str_replace(['-', '_'], ' ', $c);
        if (isset($cityMap[$cCleaned])) return $cityMap[$cCleaned];
    }

    if (!empty($filename)) {
        $fn = strtoupper($filename);
        foreach ($stateMap as $name => $code) {
            if (strpos($fn, $name) !== false) return $code;
        }
        if (strpos($fn, 'FLORIDA') !== false || strpos($fn, 'FL') !== false) return 'FL';
        if (strpos($fn, 'MARYLAND') !== false || strpos($fn, 'MD') !== false) return 'MD';
        if (strpos($fn, 'NEW YORK') !== false || strpos($fn, 'NY') !== false) return 'NY';
        if (strpos($fn, 'CALIFORNIA') !== false || strpos($fn, 'CA') !== false) return 'CA';
        if (strpos($fn, 'TEXAS') !== false || strpos($fn, 'TX') !== false) return 'TX';
    }

    if (!empty($rawState)) {
        $s = strtoupper(trim($rawState));
        if (strlen($s) === 2 && preg_match('/^[A-Z]{2}$/', $s)) return $s;
    }

    return '';
}

/**
 * Check if file is an Excel file
 */
function isExcelFile($filename) {
    $allowed = ['xlsx', 'xls'];
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, $allowed);
}

/**
 * Sanitize input
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Format output data for API response
 */
function formatResponse($success, $data = null, $message = '') {
    $response = ['success' => $success];
    if ($message) $response['message'] = $message;
    if ($data !== null) $response['data'] = $data;
    return json_encode($response);
}

/**
 * Log errors to error log
 */
function logError($message) {
    $logFile = __DIR__ . '/../../logs/error.log';
    $logDir = dirname($logFile);
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}
?>