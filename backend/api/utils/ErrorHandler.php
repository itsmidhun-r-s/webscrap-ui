<?php
class ErrorHandler {
    private static $instance = null;
    private $logFile;
    private $environment;
    
    private function __construct() {
        $this->logFile = __DIR__ . '/../../logs/error.log';
        $this->environment = getenv('APP_ENV') ?: 'development';
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function handleError($errno, $errstr, $errfile, $errline) {
        $message = "Error: [$errno] $errstr in $errfile on line $errline";
        $this->log($message);
        
        if ($this->environment === 'development') {
            echo json_encode([
                'success' => false,
                'error' => $message,
                'file' => $errfile,
                'line' => $errline
            ]);
        }
        
        return true;
    }
    
    public function handleException($exception) {
        $message = "Exception: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine();
        $this->log($message);
        
        if ($this->environment === 'development') {
            echo json_encode([
                'success' => false,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'An internal error occurred'
            ]);
        }
        
        return true;
    }
    
    private function log($message) {
        $logDir = dirname($this->logFile);
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logEntry = '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n";
        file_put_contents($this->logFile, $logEntry, FILE_APPEND);
    }
}

// Set error handlers
$errorHandler = ErrorHandler::getInstance();
set_error_handler([$errorHandler, 'handleError']);
set_exception_handler([$errorHandler, 'handleException']);
?>