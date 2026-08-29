// Auto-detect API Base URL with .env override
const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';  // Local development PHP backend
    } else {
        return 'https://midhun.judinjoseph.xyz/backend/api';
    }
};

export const API_BASE_URL = getApiUrl();

/**
 * Helper to safely handle JSON API responses and prevent Unexpected token '<' errors
 */
async function handleResponse(response: Response, defaultErrorMsg: string) {
    const text = await response.text();
    let json: any = null;
    
    try {
        json = JSON.parse(text);
    } catch {
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        const snippet = cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
        throw new Error(snippet || defaultErrorMsg);
    }

    if (!response.ok || (json && json.success === false)) {
        const msg = json?.message || defaultErrorMsg;
        throw new Error(msg);
    }

    return json;
}

/**
 * Upload physical Excel file to backend MySQL database & uploads directory
 */
export async function uploadFileToBackend(file: File, uploadedBy: string = 'Team Member') {
    const formData = new FormData();
    formData.append('excel_file', file);
    formData.append('uploaded_by', uploadedBy);

    const response = await fetch(`${API_BASE_URL}/files/upload.php`, {
        method: 'POST',
        body: formData
    });

    return await handleResponse(response, 'Failed to upload file to database');
}

/**
 * Save extracted contact records to MySQL database
 */
export async function saveExtractedDataToBackend(fileId: string | number, extractedData: any[], extractedBy: string = 'Team Member') {
    const response = await fetch(`${API_BASE_URL}/extract/extract.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            file_id: fileId,
            extracted_data: extractedData,
            extracted_by: extractedBy
        })
    });

    return await handleResponse(response, 'Failed to save extracted data to database');
}

/**
 * Fetch all uploaded files and stored extracted records from backend database
 */
export async function fetchFilesFromBackend() {
    const response = await fetch(`${API_BASE_URL}/files/list.php?include_data=1`, {
        method: 'GET'
    });

    return await handleResponse(response, 'Failed to fetch files from database');
}

/**
 * Delete a file and its database records from backend
 */
export async function deleteFileFromBackend(fileId: string | number) {
    const response = await fetch(`${API_BASE_URL}/files/delete.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId })
    });

    return await handleResponse(response, 'Failed to delete file from database');
}