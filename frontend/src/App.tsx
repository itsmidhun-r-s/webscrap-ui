import React, { useState, useMemo, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import * as XLSX from 'xlsx';
import { uploadFileToBackend, saveExtractedDataToBackend, fetchFilesFromBackend, deleteFileFromBackend } from './services/api';

const {
  FileSpreadsheet, CheckCircle, XCircle, Loader2,
  Search, Copy, Trash2, Download, FileDown, ArrowLeft, ArrowRight,
  Database, User, Phone, Mail,
  Shield, ChevronRight, Upload,
  BarChart3, Filter, Rocket, BadgeCheck,
  Brain, Moon, Sun, FolderOpen, History, Layers, Merge,
  MapPin, Flag, AlertTriangle, CheckSquare, Square
} = LucideIcons;

// Valid email providers
const VALID_PROVIDERS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

const isValidEmail = (email: string) => {
  if (!email || typeof email !== 'string') return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  return VALID_PROVIDERS.includes(domain);
};

const getEmailDomain = (email: string) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '';
  return parts[1].toLowerCase();
};

const STATE_NAME_TO_CODE: { [key: string]: string } = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
  'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
  'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
  'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
  'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
  'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
  'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
};

const CITY_TO_STATE: { [key: string]: string } = {
  'new-york': 'NY', 'new york': 'NY', 'nyc': 'NY', 'brooklyn': 'NY', 'queens': 'NY', 'bronx': 'NY', 'manhattan': 'NY', 'albany': 'NY', 'buffalo': 'NY', 'rochester': 'NY',
  'miami': 'FL', 'orlando': 'FL', 'tampa': 'FL', 'jacksonville': 'FL', 'fort lauderdale': 'FL', 'tallahassee': 'FL',
  'baltimore': 'MD', 'annapolis': 'MD', 'bethesda': 'MD', 'silver spring': 'MD',
  'chicago': 'IL', 'springfield': 'IL', 'los angeles': 'CA', 'san francisco': 'CA', 'san diego': 'CA', 'san jose': 'CA', 'sacramento': 'CA',
  'houston': 'TX', 'dallas': 'TX', 'austin': 'TX', 'san antonio': 'TX',
  'atlanta': 'GA', 'boston': 'MA', 'seattle': 'WA', 'denver': 'CO', 'phoenix': 'AZ', 'las vegas': 'NV', 'philadelphia': 'PA', 'pittsburgh': 'PA', 'detroit': 'MI'
};

const formatCityName = (city: string): string => {
  if (!city) return '';
  const cleaned = city.replace(/[-_]+/g, ' ').trim();
  return cleaned.replace(/\b\w/g, l => l.toUpperCase());
};

const VALID_US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'MP', 'AS'
]);

const normalizeStateCode = (rawState: string = '', city: string = '', filename: string = ''): string => {
  if (rawState) {
    const s = rawState.trim().toUpperCase();
    if (s.length === 2 && VALID_US_STATE_CODES.has(s)) return s;
    if (STATE_NAME_TO_CODE[s]) return STATE_NAME_TO_CODE[s];
  }
  
  if (city) {
    const c = city.trim().toLowerCase();
    if (CITY_TO_STATE[c]) return CITY_TO_STATE[c];
    const cCleaned = c.replace(/[-_]+/g, ' ');
    if (CITY_TO_STATE[cCleaned]) return CITY_TO_STATE[cCleaned];
  }
  
  if (filename) {
    const fn = filename.toUpperCase();
    for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
      if (fn.includes(name)) return code;
    }
    if (fn.includes('FLORIDA') || fn.includes('FL')) return 'FL';
    if (fn.includes('MARYLAND') || fn.includes('MD')) return 'MD';
    if (fn.includes('NEW YORK') || fn.includes('NY')) return 'NY';
    if (fn.includes('CALIFORNIA') || fn.includes('CA')) return 'CA';
    if (fn.includes('TEXAS') || fn.includes('TX')) return 'TX';
  }
  
  if (rawState) {
    const s = rawState.trim().toUpperCase();
    if (s.length === 2 && /^[A-Z]{2}$/.test(s)) return s;
  }
  
  return '';
};

const normalizeRecords = (records: any[], defaultSourceFile: string = ''): any[] => {
  if (!Array.isArray(records)) return [];
  return records.map(r => {
    const rawCity = r.city || '';
    const rawState = r.state || '';
    const city = formatCityName(rawCity);
    const state = normalizeStateCode(rawState, rawCity, r.sourceFile || defaultSourceFile);
    return {
      ...r,
      city: city || rawCity || '',
      state: state || ''
    };
  });
};

const extractDataFromExcel = (jsonData: any[], sourceFilename: string = ''): any[] => {
  const extracted: any[] = [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /[\+\d\s\-\(\)]{7,}/;
  
  jsonData.forEach((row) => {
    const rowValues = Object.values(row);
    const rowKeys = Object.keys(row);
    let name = '';
    let phone = '';
    let email = '';
    let city = '';
    let state = '';
    
    for (const value of rowValues) {
      if (typeof value === 'string') {
        const emailMatch = value.match(emailRegex);
        if (emailMatch) {
          email = emailMatch[0];
          break;
        }
      }
    }
    
    for (const value of rowValues) {
      if (typeof value === 'string' && value.length > 2) {
        if (/^[a-zA-Z\s\.]{2,}$/.test(value) && !value.includes('@') && !/\d/.test(value)) {
          name = value;
          break;
        }
      }
    }
    
    for (const value of rowValues) {
      if (typeof value === 'string') {
        const phoneMatch = value.match(phoneRegex);
        if (phoneMatch && !value.includes('@')) {
          phone = phoneMatch[0].trim();
          break;
        }
      }
    }

    for (let i = 0; i < rowKeys.length; i++) {
      const key = rowKeys[i].toLowerCase();
      const value = rowValues[i];
      
      if (typeof value === 'string' && value.trim() !== '') {
        if (key.includes('state') || key.includes('province') || key.includes('region') || 
            key.includes('country') || key === 'st' || key === 'state_code') {
          state = value.trim();
        }
        
        if (key.includes('city') || key.includes('town') || key.includes('municipality') || 
            key === 'city_name' || key === 'locality') {
          city = value.trim();
        }
      }
    }

    if (!city || !state) {
      for (const value of rowValues) {
        if (typeof value === 'string' && value.includes(',')) {
          const parts = value.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            const secondLast = parts[parts.length - 2];
            if (!state) state = lastPart;
            if (!city) city = secondLast;
          }
        }
      }
    }
    
    const formattedCity = formatCityName(city);
    const normalizedState = normalizeStateCode(state, city, sourceFilename);

    if (email) {
      extracted.push({
        name: name || 'Unknown',
        phone: phone || 'N/A',
        email: email,
        domain: getEmailDomain(email),
        city: formattedCity || city || '',
        state: normalizedState || '',
        sourceFile: sourceFilename || ''
      });
    }
  });
  
  return extracted;
};

interface UploadedFileInfo {
  id: string;
  filename: string;
  fileSize: string;
  uploadedAt: string;
  recordCount: number;
  totalRows: number;
  data: any[];
  isMerged?: boolean;
  stats: {
    total: number;
    names: number;
    phones: number;
    validEmails: number;
    skipped: number;
    duplicates: number;
  };
}

interface PendingFile {
  file: File;
  fileName: string;
  fileSize: string;
  progress: number;
  status: 'pending' | 'extracting' | 'complete' | 'error' | 'duplicate';
  extractedData?: any[];
  stats?: any;
}

interface DuplicateFileInfo {
  fileName: string;
  fileSize: string;
  reason: 'exact_match' | 'similar_name' | 'same_base_name';
}

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [duplicateFiles, setDuplicateFiles] = useState<DuplicateFileInfo[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const DEFAULT_STATS = { total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 };
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [selectedFilesForDeletion, setSelectedFilesForDeletion] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const pageSize = 5;

  // Helper function to extract base name from filename (remove date and common patterns)
  const getFileBaseName = (filename: string): string => {
    let name = filename.replace(/\.[^.]+$/, '');
    
    name = name.replace(/[_-]?\d{8}/g, '');
    name = name.replace(/[_-]?\d{4}-\d{2}-\d{2}/g, '');
    name = name.replace(/[_-]?\d{6}/g, '');
    name = name.replace(/[_-]?\d{2}:\d{2}:\d{2}/g, '');
    name = name.replace(/[_-]?\d{4}/g, '');
    name = name.replace(/[_\s-]+$/, '');
    
    return name.toLowerCase().trim();
  };

  // Helper to get city/state from filename
  const getLocationFromFilename = (filename: string): string => {
    const name = filename.toLowerCase();
    const locationMatch = name.match(/[_-]([a-z]+(?:-[a-z]+)?)(?:[_-]md|-[a-z]{2})?/);
    if (locationMatch) {
      return locationMatch[1];
    }
    return '';
  };

  // Improved duplicate detection
  const checkDuplicateFiles = (files: File[]): { unique: File[], duplicates: DuplicateFileInfo[] } => {
    const existingFilenames = new Set(uploadedFiles.map(f => f.filename.toLowerCase()));
    const pendingFilenames = new Set(pendingFiles.map(f => f.fileName.toLowerCase()));
    
    // Get base names of existing files
    const existingBaseNames = new Map<string, string>();
    uploadedFiles.forEach(f => {
      const baseName = getFileBaseName(f.filename);
      if (baseName) {
        existingBaseNames.set(baseName, f.filename);
      }
    });
    
    const pendingBaseNames = new Map<string, string>();
    pendingFiles.forEach(f => {
      const baseName = getFileBaseName(f.fileName);
      if (baseName) {
        pendingBaseNames.set(baseName, f.fileName);
      }
    });
    
    const unique: File[] = [];
    const duplicates: DuplicateFileInfo[] = [];
    const seenNames = new Set<string>();

    for (const file of files) {
      const fileNameLower = file.name.toLowerCase();
      const fileBaseName = getFileBaseName(file.name);
      const location = getLocationFromFilename(file.name);
      
      let isDuplicate = false;
      let duplicateReason: 'exact_match' | 'similar_name' | 'same_base_name' = 'exact_match';
      
      // Check 1: Exact match
      if (existingFilenames.has(fileNameLower) || pendingFilenames.has(fileNameLower)) {
        isDuplicate = true;
        duplicateReason = 'exact_match';
      }
      
      // Check 2: Same base name (ignoring dates and timestamps)
      if (!isDuplicate && fileBaseName) {
        // Check against existing files
        for (const [existingBase] of existingBaseNames) {
          if (fileBaseName === existingBase) {
            isDuplicate = true;
            duplicateReason = 'same_base_name';
            break;
          }
          // Check if they share the same location
          if (location && existingBase.includes(location)) {
            isDuplicate = true;
            duplicateReason = 'same_base_name';
            break;
          }
        }
        
        // Check against pending files
        if (!isDuplicate) {
          for (const [pendingBase] of pendingBaseNames) {
            if (fileBaseName === pendingBase) {
              isDuplicate = true;
              duplicateReason = 'same_base_name';
              break;
            }
            if (location && pendingBase.includes(location)) {
              isDuplicate = true;
              duplicateReason = 'same_base_name';
              break;
            }
          }
        }
      }
      
      // Check 3: Similar name (share significant portion)
      if (!isDuplicate && fileBaseName) {
        const nameParts = fileBaseName.split(/[_-]/);
        if (nameParts.length >= 2) {
          const keyParts = nameParts.slice(0, 2).join('-');
          
          for (const [existingBase] of existingBaseNames) {
            if (existingBase.includes(keyParts) || keyParts.includes(existingBase)) {
              isDuplicate = true;
              duplicateReason = 'similar_name';
              break;
            }
          }
          
          if (!isDuplicate) {
            for (const [pendingBase] of pendingBaseNames) {
              if (pendingBase.includes(keyParts) || keyParts.includes(pendingBase)) {
                isDuplicate = true;
                duplicateReason = 'similar_name';
                break;
              }
            }
          }
        }
      }
      
      if (isDuplicate) {
        duplicates.push({
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          reason: duplicateReason
        });
      } else if (!seenNames.has(fileNameLower)) {
        seenNames.add(fileNameLower);
        unique.push(file);
      }
    }
    
    return { unique, duplicates };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      const { unique, duplicates } = checkDuplicateFiles(fileArray);
      
      if (duplicates.length > 0) {
        setDuplicateFiles(duplicates);
        setShowDuplicateWarning(true);
      }
      
      if (unique.length > 0) {
        const newPendingFiles: PendingFile[] = unique.map(file => ({
          file: file,
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          progress: 0,
          status: 'pending'
        }));
        
        setPendingFiles(prev => [...prev, ...newPendingFiles]);
        extractAllFiles([...pendingFiles, ...newPendingFiles]);
      } else if (unique.length === 0 && duplicates.length > 0) {
        setTimeout(() => {
          setShowDuplicateWarning(true);
        }, 100);
      }
      
      const input = document.getElementById('fileInput') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
      
      if (fileArray.length === 0) {
        alert('Please drop only .xlsx or .xls files.');
        return;
      }
      
      const { unique, duplicates } = checkDuplicateFiles(fileArray);
      
      if (duplicates.length > 0) {
        setDuplicateFiles(duplicates);
        setShowDuplicateWarning(true);
      }
      
      if (unique.length > 0) {
        const newPendingFiles: PendingFile[] = unique.map(file => ({
          file: file,
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          progress: 0,
          status: 'pending'
        }));
        
        setPendingFiles(prev => [...prev, ...newPendingFiles]);
        extractAllFiles([...pendingFiles, ...newPendingFiles]);
      } else if (unique.length === 0 && duplicates.length > 0) {
        setTimeout(() => {
          setShowDuplicateWarning(true);
        }, 100);
      }
    }
  };

  const removeDuplicateFromList = (fileName: string) => {
    setDuplicateFiles(prev => prev.filter(d => d.fileName !== fileName));
    if (duplicateFiles.length === 1) {
      setShowDuplicateWarning(false);
    }
  };

  const clearAllDuplicates = () => {
    setDuplicateFiles([]);
    setShowDuplicateWarning(false);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractAllFiles = async (filesToExtract: PendingFile[]) => {
    if (filesToExtract.length === 0) return;
    
    setIsExtracting(true);
    
    for (let i = 0; i < filesToExtract.length; i++) {
      const pendingFile = filesToExtract[i];
      if (pendingFile.status === 'complete' || pendingFile.status === 'extracting') continue;
      
      setPendingFiles(prev => 
        prev.map((f, idx) => 
          idx === i ? { ...f, status: 'extracting', progress: 10 } : f
        )
      );
      
      try {
        const file = pendingFile.file;
        const reader = new FileReader();
        
        const result = await new Promise<ArrayBuffer>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        
        const workbook = XLSX.read(result, { 
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          defval: '',
          blankrows: false
        });
        
        if (jsonData.length === 0) {
          throw new Error('The Excel file appears to be empty.');
        }
        
        const totalRows = jsonData.length;
        
        for (let progress = 10; progress <= 90; progress += 10) {
          setPendingFiles(prev => 
            prev.map((f, idx) => 
              idx === i ? { ...f, progress: Math.min(progress, 90) } : f
            )
          );
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const raw = extractDataFromExcel(jsonData);
        raw.forEach(r => r.sourceFile = file.name);
        
        const valid = raw.filter(row => isValidEmail(row.email));
        const seen = new Set();
        const unique = valid.filter(row => {
          const key = row.email.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        const newStats = {
          total: raw.length,
          names: unique.filter(r => r.name && r.name.trim() !== '' && r.name !== 'Unknown').length,
          phones: unique.filter(r => r.phone && r.phone.trim() !== '' && r.phone !== 'N/A').length,
          validEmails: unique.length,
          skipped: raw.length - unique.length,
          duplicates: raw.length - unique.length
        };
        
        let backendId = Date.now().toString() + '_' + i;
        
        try {
          const uploadRes = await uploadFileToBackend(file);
          if (uploadRes && uploadRes.success && uploadRes.file) {
            backendId = uploadRes.file.id.toString();
            await saveExtractedDataToBackend(backendId, unique);
          }
        } catch (dbErr: any) {
          console.warn('Database sync offline/unavailable:', dbErr?.message || dbErr);
        }
        
        const newFile: UploadedFileInfo = {
          id: backendId,
          filename: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          uploadedAt: new Date().toLocaleString(),
          recordCount: unique.length,
          totalRows: totalRows,
          data: unique,
          isMerged: false,
          stats: newStats
        };
        
        setPendingFiles(prev => 
          prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'complete', 
              progress: 100,
              extractedData: unique,
              stats: newStats
            } : f
          )
        );
        
        setUploadedFiles(prev => [newFile, ...prev.filter(f => f.id !== backendId)]);
        setSelectedFileId(newFile.id);
        
        if (i === 0) {
          setExtractedData(unique);
          setStats(newStats);
          setExtractionComplete(true);
          setProviderFilter('all');
          setCityFilter('');
          setStateFilter('all');
          setSearchTerm('');
        }
        
      } catch (error) {
        console.error('Error extracting file:', error);
        setPendingFiles(prev => 
          prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', progress: 0 } : f
          )
        );
      }
    }
    
    setIsExtracting(false);
  };

  const loadSavedFiles = async () => {
    try {
      const backendRes = await fetchFilesFromBackend();
      if (backendRes && backendRes.success && Array.isArray(backendRes.files) && backendRes.files.length > 0) {
        const normalizedFiles = backendRes.files.map((f: any) => ({
          ...f,
          data: normalizeRecords(f.data || [], f.filename)
        }));
        setUploadedFiles(normalizedFiles);
        if (!selectedFileId) {
          const latestFile = normalizedFiles[0];
          setSelectedFileId(latestFile.id);
          setExtractedData(latestFile.data || []);
          setStats(latestFile.stats || { total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
        }
        return;
      }
    } catch (error) {
      console.warn('Backend database fetch unavailable or empty, fallback to localStorage:', error);
    }

    try {
      const saved = localStorage.getItem('uploadedFiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalizedFiles = parsed.map((f: any) => ({
          ...f,
          data: normalizeRecords(f.data || [], f.filename)
        }));
        setUploadedFiles(normalizedFiles);
        if (normalizedFiles.length > 0 && !selectedFileId) {
          setSelectedFileId(normalizedFiles[normalizedFiles.length - 1].id);
          setExtractedData(normalizedFiles[normalizedFiles.length - 1].data || []);
          setStats(normalizedFiles[normalizedFiles.length - 1].stats || { total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
        }
      }
    } catch (error) {
      console.error('Error loading saved files:', error);
    }
  };

  const loadFileData = (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file) {
      const normData = normalizeRecords(file.data || [], file.filename);
      setExtractedData(normData);
      setStats(file.stats);
      setExtractionComplete(true);
      setActiveView('results');
      setSelectedFileId(fileId);
      setProviderFilter('all');
      setCityFilter('');
      setStateFilter('all');
      setSearchTerm('');
      setCurrentPage(1);
    }
  };

  const saveFilesToStorage = (files: UploadedFileInfo[]) => {
    try {
      localStorage.setItem('uploadedFiles', JSON.stringify(files));
    } catch (error) {
      console.error('Error saving files:', error);
    }
  };

  useEffect(() => {
    loadSavedFiles();
  }, []);

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      saveFilesToStorage(uploadedFiles);
    }
  }, [uploadedFiles]);

  const domainStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    extractedData.forEach(row => {
      const domain = row.domain || 'unknown';
      stats[domain] = (stats[domain] || 0) + 1;
    });
    return stats;
  }, [extractedData]);

  const cityStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    extractedData.forEach(row => {
      const city = row.city ? formatCityName(row.city) : 'Unknown';
      stats[city] = (stats[city] || 0) + 1;
    });
    return stats;
  }, [extractedData]);

  const stateStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    extractedData.forEach(row => {
      const state = row.state ? row.state.toUpperCase() : 'Unknown';
      stats[state] = (stats[state] || 0) + 1;
    });
    return stats;
  }, [extractedData]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    extractedData.forEach(row => {
      if (row.city && row.city.trim() !== '') cities.add(formatCityName(row.city));
    });
    return Array.from(cities).sort();
  }, [extractedData]);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    extractedData.forEach(row => {
      if (row.state && row.state.trim() !== '') states.add(row.state.toUpperCase());
    });
    return Array.from(states).sort();
  }, [extractedData]);

  const filteredData = useMemo(() => {
    if (!extractedData || extractedData.length === 0) return [];
    
    let data = [...extractedData];
    
    if (searchTerm && searchTerm.trim() !== '') {
      const s = searchTerm.toLowerCase().trim();
      data = data.filter(row => {
        const name = (row.name || '').toLowerCase();
        const phone = (row.phone || '').toLowerCase();
        const email = (row.email || '').toLowerCase();
        const city = (row.city || '').toLowerCase();
        const state = (row.state || '').toLowerCase();
        const domain = (row.domain || '').toLowerCase();
        return name.includes(s) || phone.includes(s) || email.includes(s) || 
               city.includes(s) || state.includes(s) || domain.includes(s);
      });
    }
    
    if (providerFilter !== 'all') {
      data = data.filter(row => {
        const domain = (row.domain || '').toLowerCase();
        return domain === providerFilter.toLowerCase();
      });
    }

    if (cityFilter && cityFilter.trim() !== '') {
      const c = cityFilter.toLowerCase().trim();
      data = data.filter(row => {
        const city = (row.city || '').toLowerCase();
        return city.includes(c);
      });
    }

    if (stateFilter !== 'all') {
      data = data.filter(row => {
        const state = (row.state || '').toUpperCase();
        return state === stateFilter.toUpperCase();
      });
    }
    
    if (sortConfig.key) {
      data = [...data].sort((a, b) => {
        const aVal = (a[sortConfig.key as keyof typeof a] || '').toString().toLowerCase();
        const bVal = (b[sortConfig.key as keyof typeof b] || '').toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [extractedData, searchTerm, providerFilter, cityFilter, stateFilter, sortConfig]);

  const totalResults = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, providerFilter, cityFilter, stateFilter]);

  // Toggle file selection for batch delete
  const toggleFileSelectionForDeletion = (fileId: string) => {
    setSelectedFilesForDeletion(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleAllFilesForDeletion = () => {
    if (selectedFilesForDeletion.length === uploadedFiles.length) {
      setSelectedFilesForDeletion([]);
    } else {
      setSelectedFilesForDeletion(uploadedFiles.map(f => f.id));
    }
  };

  const batchDeleteSelectedFiles = async () => {
    if (selectedFilesForDeletion.length === 0) {
      alert('Please select at least one file to delete.');
      return;
    }

    const filesToDelete = uploadedFiles.filter(f => selectedFilesForDeletion.includes(f.id));
    const mergedFiles = filesToDelete.filter(f => f.isMerged);
    const originalFiles = filesToDelete.filter(f => !f.isMerged);
    
    let confirmMessage = `Are you sure you want to delete ${selectedFilesForDeletion.length} file(s)?\n\n`;
    if (originalFiles.length > 0) {
      confirmMessage += `📄 ${originalFiles.length} original file(s)\n`;
    }
    if (mergedFiles.length > 0) {
      confirmMessage += `🟣 ${mergedFiles.length} merged file(s)\n`;
    }
    confirmMessage += `\nThis action cannot be undone!`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsBatchDeleting(true);

    try {
      for (const fileId of selectedFilesForDeletion) {
        try {
          await deleteFileFromBackend(fileId);
        } catch (err) {
          console.warn(`Failed to delete file ${fileId} from backend:`, err);
        }
      }

      const remainingFiles = uploadedFiles.filter(f => !selectedFilesForDeletion.includes(f.id));
      setUploadedFiles(remainingFiles);
      saveFilesToStorage(remainingFiles);

      if (selectedFileId && selectedFilesForDeletion.includes(selectedFileId)) {
        if (remainingFiles.length > 0) {
          setSelectedFileId(remainingFiles[0].id);
          loadFileData(remainingFiles[0].id);
        } else {
          setExtractedData([]);
          setStats({ total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
          setSelectedFileId(null);
          setActiveView('dashboard');
        }
      }

      setSelectedFilesForDeletion([]);
      setShowBatchDeleteConfirm(false);
      alert(`✅ Successfully deleted ${selectedFilesForDeletion.length} file(s)!`);
    } catch (error) {
      console.error('Error during batch delete:', error);
      alert('Error deleting files. Please try again.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const goToDashboard = () => {
    setActiveView('dashboard');
    setCurrentPage(1);
    setSelectedRows([]);
    setProviderFilter('all');
    setCityFilter('');
    setStateFilter('all');
    setSearchTerm('');
  };

  const toggleRowSelection = (email: string) => {
    setSelectedRows(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const toggleAllRows = () => {
    if (selectedRows.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(r => r.email));
    }
  };

  const deleteRow = (email: string) => {
    const updatedData = extractedData.filter(r => r.email !== email);
    setExtractedData(updatedData);
    const updatedFiles = uploadedFiles.map(f => {
      if (f.id === selectedFileId) {
        const newStats = {
          total: updatedData.length,
          names: updatedData.filter(r => r.name && r.name.trim() !== '' && r.name !== 'Unknown').length,
          phones: updatedData.filter(r => r.phone && r.phone.trim() !== '' && r.phone !== 'N/A').length,
          validEmails: updatedData.length,
          skipped: 0,
          duplicates: 0
        };
        return { ...f, data: updatedData, recordCount: updatedData.length, stats: newStats };
      }
      return f;
    });
    setUploadedFiles(updatedFiles);
    saveFilesToStorage(updatedFiles);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const exportCSV = (dataToExport?: any[], filename?: string) => {
    const data = dataToExport || extractedData;
    if (data.length === 0) {
      alert('No data to export. Please extract data first.');
      return;
    }
    const header = 'Name,Phone,Email,Domain,City,State,Source File\n';
    const rows = data.map(r => 
      `${r.name},${r.phone},${r.email},${r.domain || ''},${r.city || ''},${r.state || ''},${r.sourceFile || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `extracted_data_${Date.now()}.csv`;
    a.click();
  };

  const exportExcel = (dataToExport?: any[], filename?: string) => {
    const data = dataToExport || extractedData;
    if (data.length === 0) {
      alert('No data to export. Please extract data first.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
    XLSX.writeFile(wb, filename || `extracted_data_${Date.now()}.xlsx`);
  };

  const mergeAllFiles = () => {
    const originalFiles = uploadedFiles.filter(f => !f.isMerged);
    
    if (originalFiles.length < 2) {
      alert('You need at least 2 original files to merge.');
      return;
    }

    setIsMerging(true);
    
    try {
      let allData: any[] = [];
      originalFiles.forEach(file => {
        const fileData = file.data.map(row => ({
          ...row,
          sourceFile: file.filename
        }));
        allData = [...allData, ...fileData];
      });

      const seen = new Set();
      const mergedData = allData.filter(row => {
        const key = row.email.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const mergedStats = {
        total: mergedData.length,
        names: mergedData.filter(r => r.name && r.name.trim() !== '' && r.name !== 'Unknown').length,
        phones: mergedData.filter(r => r.phone && r.phone.trim() !== '' && r.phone !== 'N/A').length,
        validEmails: mergedData.length,
        skipped: allData.length - mergedData.length,
        duplicates: allData.length - mergedData.length
      };

      const mergedFile: UploadedFileInfo = {
        id: 'merged_' + Date.now(),
        filename: `MERGED_${originalFiles.length}_files.xlsx`,
        fileSize: `${(mergedData.length * 0.1).toFixed(1)} KB`,
        uploadedAt: new Date().toLocaleString(),
        recordCount: mergedData.length,
        totalRows: allData.length,
        data: mergedData,
        isMerged: true,
        stats: mergedStats
      };

      const updatedFiles = [...uploadedFiles, mergedFile];
      setUploadedFiles(updatedFiles);
      saveFilesToStorage(updatedFiles);
      
      setSelectedFileId(mergedFile.id);
      setExtractedData(mergedData);
      setStats(mergedStats);
      setExtractionComplete(true);
      setActiveView('results');
      setProviderFilter('all');
      setCityFilter('');
      setStateFilter('all');
      setSearchTerm('');

      setIsMerging(false);
      alert(`✅ Successfully merged ${originalFiles.length} files!\nTotal records: ${mergedData.length}\nDuplicates removed: ${allData.length - mergedData.length}`);
    } catch (error) {
      console.error('Error merging files:', error);
      setIsMerging(false);
      alert('Error merging files. Please try again.');
    }
  };

  const deleteMergedFileOnly = () => {
    const mergedFiles = uploadedFiles.filter(f => f.isMerged);
    if (mergedFiles.length === 0) {
      alert('No merged files to delete.');
      return;
    }

    if (window.confirm('Delete the merged file? Original files will be kept.')) {
      const updatedFiles = uploadedFiles.filter(f => !f.isMerged);
      setUploadedFiles(updatedFiles);
      saveFilesToStorage(updatedFiles);
      
      if (selectedFileId && uploadedFiles.find(f => f.id === selectedFileId)?.isMerged) {
        if (updatedFiles.length > 0) {
          setSelectedFileId(updatedFiles[updatedFiles.length - 1].id);
          loadFileData(updatedFiles[updatedFiles.length - 1].id);
        } else {
          setExtractedData([]);
          setStats({ total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
          setSelectedFileId(null);
          setActiveView('dashboard');
        }
      }
      alert('Merged file deleted. Original files kept.');
    }
  };

  const deleteFile = async (fileId: string) => {
    const fileToDelete = uploadedFiles.find(f => f.id === fileId);
    if (fileToDelete?.isMerged) {
      const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
      setUploadedFiles(updatedFiles);
      saveFilesToStorage(updatedFiles);
      if (selectedFileId === fileId) {
        if (updatedFiles.length > 0) {
          setSelectedFileId(updatedFiles[0].id);
          loadFileData(updatedFiles[0].id);
        } else {
          setExtractedData([]);
          setStats({ total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
          setSelectedFileId(null);
          setActiveView('dashboard');
        }
      }
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${fileToDelete?.filename}" and its data from the database?`)) {
      try {
        await deleteFileFromBackend(fileId);
      } catch (err) {
        console.warn('Backend database delete warning:', err);
      }

      const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
      setUploadedFiles(updatedFiles);
      saveFilesToStorage(updatedFiles);
      if (selectedFileId === fileId) {
        if (updatedFiles.length > 0) {
          setSelectedFileId(updatedFiles[0].id);
          loadFileData(updatedFiles[0].id);
        } else {
          setExtractedData([]);
          setStats({ total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
          setSelectedFileId(null);
          setActiveView('dashboard');
        }
      }
    }
  };

  const switchFile = (fileId: string) => {
    setSelectedFileId(fileId);
    loadFileData(fileId);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
      setUploadedFiles([]);
      setExtractedData([]);
      setStats({ total: 0, names: 0, phones: 0, validEmails: 0, skipped: 0, duplicates: 0 });
      setExtractionComplete(false);
      setActiveView('dashboard');
      setSelectedFileId(null);
      localStorage.removeItem('uploadedFiles');
      alert('All data cleared successfully!');
    }
  };

  const getTotalStats = () => {
    let totalRecords = 0;
    let totalFiles = uploadedFiles.length;
    uploadedFiles.forEach(f => {
      totalRecords += f.recordCount;
    });
    return { totalRecords, totalFiles };
  };

  const getOriginalFilesCount = () => {
    return uploadedFiles.filter(f => !f.isMerged).length;
  };

  const handleProviderClick = (provider: string) => {
    setProviderFilter(providerFilter === provider ? 'all' : provider);
    setCurrentPage(1);
  };

  const handleCityClick = (city: string) => {
    setCityFilter(cityFilter === city ? '' : city);
    setCurrentPage(1);
  };

  const handleStateClick = (state: string) => {
    setStateFilter(stateFilter === state ? 'all' : state);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setProviderFilter('all');
    setCityFilter('');
    setStateFilter('all');
    setCurrentPage(1);
  };

  const bgClass = isDarkMode ? 'bg-[#0a0e1a]' : 'bg-slate-50';
  const textClass = isDarkMode ? 'text-white' : 'text-slate-800';
  const cardClass = isDarkMode ? 'bg-[#111827]/80 backdrop-blur-2xl border-[#1e293b]/50 shadow-2xl shadow-blue-500/5' : 'bg-white/80 backdrop-blur-2xl border-slate-200/30 shadow-xl shadow-slate-200/30';
  const inputClass = isDarkMode ? 'bg-[#1e293b] border-[#334155] text-white placeholder:text-slate-400' : 'bg-slate-50/50 border-slate-200 text-slate-800';
  const headerClass = isDarkMode ? 'bg-[#0f172a]/80 backdrop-blur-2xl border-[#1e293b]/30 shadow-xl shadow-blue-500/5' : 'bg-white/70 backdrop-blur-2xl border-slate-200/30 shadow-xl shadow-slate-200/20';
  const tableHeaderClass = isDarkMode ? 'bg-gradient-to-r from-[#1e293b]/80 to-[#1a2332]/50 border-[#1e293b]/50' : 'bg-gradient-to-r from-slate-50/80 to-blue-50/50 border-slate-200/50';
  const tableRowClass = isDarkMode ? 'border-[#1e293b]/50 hover:bg-gradient-to-r hover:from-[#1a2332]/50 hover:to-transparent' : 'border-slate-100/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent';

  const totalStats = getTotalStats();
  const originalFilesCount = getOriginalFilesCount();

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} font-sans antialiased transition-colors duration-300`}>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOHYyNE0xOCAzNmg0OCIgc3Ryb2tlPSIjMjU1M2I5IiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-20" />
      </div>

      <header className={`${headerClass} sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50 animate-pulse" />
                <div className="relative p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/40">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>DataExtract</span>
                <span className="ml-2 text-[10px] font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-2.5 py-1 rounded-full shadow-lg shadow-blue-500/30">PRO</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {activeView === 'results' && (
                <button 
                  onClick={goToDashboard} 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-blue-400 transition-all hover:bg-blue-500/10 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
              )}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-[#1e293b] hover:bg-[#2d3748]' : 'bg-slate-200 hover:bg-slate-300'}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute" />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full relative" />
                </div>
                <span className="text-xs font-medium text-emerald-400">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        {/* Duplicate File Warning Modal */}
        {showDuplicateWarning && duplicateFiles.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`${cardClass} rounded-2xl p-6 max-w-lg w-full mx-4 border border-amber-500/30 shadow-2xl shadow-amber-500/20`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Duplicate Files Detected</h3>
                  <p className="text-sm text-slate-400">The following files are duplicates and will not be uploaded</p>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {duplicateFiles.map((dup, index) => (
                  <div key={index} className="bg-[#1a2332]/50 rounded-lg p-3 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-sm text-white">{dup.fileName}</span>
                        <span className="text-xs text-slate-400 ml-2">({dup.fileSize})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        dup.reason === 'exact_match' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : dup.reason === 'same_base_name'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {dup.reason === 'exact_match' ? 'Exact Match' : 
                         dup.reason === 'same_base_name' ? 'Same Base Name' : 'Similar Name'}
                      </span>
                      <button
                        onClick={() => removeDuplicateFromList(dup.fileName)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={clearAllDuplicates}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                >
                  Dismiss All
                </button>
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl"
                >
                  Continue with {duplicateFiles.length} Duplicate{duplicateFiles.length > 1 ? 's' : ''} Skipped
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Delete Confirmation Modal */}
        {showBatchDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`${cardClass} rounded-2xl p-6 max-w-md w-full mx-4 border border-red-500/30 shadow-2xl shadow-red-500/20`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Batch Delete</h3>
                  <p className="text-sm text-slate-400">You are about to delete {selectedFilesForDeletion.length} file(s)</p>
                </div>
              </div>
              
              <div className="bg-[#1a2332]/50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                {selectedFilesForDeletion.map(fileId => {
                  const file = uploadedFiles.find(f => f.id === fileId);
                  return file ? (
                    <div key={fileId} className="flex items-center gap-2 py-1 text-sm text-slate-300 border-b border-[#1e293b]/30 last:border-0">
                      <FileSpreadsheet className="w-3 h-3 text-red-400" />
                      <span>{file.filename}</span>
                      <span className="text-xs text-slate-500 ml-auto">{file.recordCount} records</span>
                    </div>
                  ) : null;
                })}
              </div>
              
              <p className="text-sm text-red-400 mb-4">⚠️ This action cannot be undone!</p>
              
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={batchDeleteSelectedFiles}
                  disabled={isBatchDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBatchDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete {selectedFilesForDeletion.length} File{selectedFilesForDeletion.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'dashboard' ? (
          <div className="space-y-10">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-full border border-blue-500/20 mb-6 shadow-lg shadow-blue-500/5">
                <Rocket className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">AI-Powered Data Extraction</span>
                <BadgeCheck className="w-4 h-4 text-purple-400" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
                <span className="text-white">Extract clean </span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">contact data</span>
                <br />
                <span className="text-white">from your </span>
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Excel files</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Upload .xlsx / .xls and let DataExtract intelligently find names, phone numbers, emails, cities, and state codes
              </p>
            </div>

            {/* Upload Card */}
            <div className={`${cardClass} rounded-3xl p-8 transition-all hover:shadow-3xl hover:scale-[1.005]`}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                <div className="flex-1 w-full">
                  <div 
                    className={`relative border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                      isDragging ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-xl shadow-blue-500/20' :
                      pendingFiles.length > 0 ? 'border-emerald-400 bg-emerald-500/10' : 'border-[#1e293b] bg-[#1a2332]/50 hover:border-blue-400 hover:bg-blue-500/5'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {pendingFiles.length === 0 ? (
                      <>
                        <div className="flex justify-center mb-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                            <div className="relative p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full">
                              <Upload className="w-16 h-16 text-blue-400" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xl font-semibold text-white">Drop your Excel files here</p>
                        <p className="text-sm text-slate-400 mt-2">or click to browse (multiple files allowed)</p>
                        <p className="text-xs text-amber-400 mt-1">⚠️ Duplicate files will be automatically skipped</p>
                        <input id="fileInput" type="file" accept=".xlsx,.xls" onChange={handleFileChange} multiple className="hidden" />
                        <button 
                          onClick={() => document.getElementById('fileInput')?.click()} 
                          className="mt-8 inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-2xl transition-all shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:scale-[1.05] active:scale-95"
                        >
                          <FileSpreadsheet className="w-5 h-5" /> Browse Excel Files
                        </button>
                        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> .xlsx</span>
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> .xls</span>
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-400" /> Secure</span>
                          <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-purple-400" /> Multi-file</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                            <span className="text-white font-semibold">{pendingFiles.length} file(s) uploading</span>
                          </div>
                          <button 
                            onClick={() => setPendingFiles([])} 
                            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all hover:scale-105 font-medium"
                          >
                            <XCircle className="w-4 h-4" /> Clear All
                          </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {pendingFiles.map((pendingFile, index) => (
                            <div key={index} className="bg-[#1a2332]/50 rounded-lg p-3 border border-[#1e293b]/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm text-white truncate">{pendingFile.fileName}</span>
                                  <span className="text-xs text-slate-400">{pendingFile.fileSize}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {pendingFile.status === 'pending' && (
                                    <span className="text-xs text-yellow-400">Pending</span>
                                  )}
                                  {pendingFile.status === 'extracting' && (
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                      <span className="text-xs text-blue-400">{pendingFile.progress}%</span>
                                    </div>
                                  )}
                                  {pendingFile.status === 'complete' && (
                                    <span className="text-xs text-emerald-400">✓ Complete</span>
                                  )}
                                  {pendingFile.status === 'error' && (
                                    <span className="text-xs text-red-400">✗ Error</span>
                                  )}
                                  {pendingFile.status === 'pending' && (
                                    <button 
                                      onClick={() => removePendingFile(index)} 
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {pendingFile.status === 'extracting' && (
                                <div className="mt-2 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                                    style={{ width: `${pendingFile.progress}%` }}
                                  />
                                </div>
                              )}
                              {pendingFile.status === 'complete' && pendingFile.stats && (
                                <div className="mt-1 text-xs text-slate-400">
                                  {pendingFile.stats.validEmails} emails extracted
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {isExtracting && (
                          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Extracting files...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center lg:items-end gap-4 w-full lg:w-auto min-w-[220px]">
                  <button
                    onClick={() => document.getElementById('fileInput')?.click()}
                    disabled={isExtracting}
                    className={`w-full px-12 py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 ${
                      isExtracting 
                        ? 'bg-[#1e293b] cursor-not-allowed text-slate-400' 
                        : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-2xl shadow-purple-500/40 hover:shadow-3xl hover:scale-[1.05] active:scale-95'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                    Add More Files
                  </button>
                  {isExtracting && (
                    <div className="w-full max-w-xs animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between text-sm font-semibold text-slate-300 mb-2">
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          Processing files...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group bg-[#111827]/80 backdrop-blur-2xl rounded-2xl p-6 border border-[#1e293b]/50 shadow-xl shadow-blue-500/5 hover:shadow-2xl transition-all hover:scale-[1.02] hover:border-blue-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <Brain className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">Smart Extraction</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">Automatically detects names, phone numbers, emails, cities, and state codes from your Excel data</p>
              </div>
              <div className="group bg-[#111827]/80 backdrop-blur-2xl rounded-2xl p-6 border border-[#1e293b]/50 shadow-xl shadow-blue-500/5 hover:shadow-2xl transition-all hover:scale-[1.02] hover:border-emerald-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white">Email Filtering</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">Only keeps emails from Gmail, Yahoo, Hotmail, and Outlook - automatically skip the rest</p>
              </div>
              <div className="group bg-[#111827]/80 backdrop-blur-2xl rounded-2xl p-6 border border-[#1e293b]/50 shadow-xl shadow-blue-500/5 hover:shadow-2xl transition-all hover:scale-[1.02] hover:border-purple-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <MapPin className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white">Location Filtering</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">Filter and export data by city and state/country codes like FL, MD, CA, etc.</p>
              </div>
            </div>

            {/* Uploaded Files History with Batch Delete */}
            <div className={`${cardClass} rounded-2xl p-6 border border-[#1e293b]/30`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Uploaded Files History ({uploadedFiles.length})</h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFilesForDeletion.length > 0 && (
                    <button
                      onClick={() => setShowBatchDeleteConfirm(true)}
                      disabled={isBatchDeleting}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Selected ({selectedFilesForDeletion.length})
                    </button>
                  )}
                  {uploadedFiles.length > 0 && (
                    <button
                      onClick={toggleAllFilesForDeletion}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-all"
                    >
                      {selectedFilesForDeletion.length === uploadedFiles.length ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      {selectedFilesForDeletion.length === uploadedFiles.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  {uploadedFiles.some(f => f.isMerged) && (
                    <button
                      onClick={deleteMergedFileOnly}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Merged
                    </button>
                  )}
                  {originalFilesCount >= 2 && (
                    <button
                      onClick={mergeAllFiles}
                      disabled={isMerging}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        isMerging 
                          ? 'bg-[#1e293b] text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.05] active:scale-95'
                      }`}
                    >
                      {isMerging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Merge className="w-4 h-4" />
                      )}
                      Merge All ({originalFilesCount} files)
                    </button>
                  )}
                </div>
              </div>

              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No files uploaded yet</p>
                  <p className="text-sm">Upload your first Excel file to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uploadedFiles.slice().reverse().map((f) => {
                    const isSelected = selectedFilesForDeletion.includes(f.id);
                    const displayName = f.filename.length > 30 ? f.filename.substring(0, 30) + '...' : f.filename;
                    
                    return (
                      <div
                        key={f.id}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10' 
                            : selectedFileId === f.id 
                              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' 
                              : 'border-[#1e293b] bg-[#1a2332]/50 hover:border-blue-400 hover:bg-blue-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFileSelectionForDeletion(f.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-[#1e293b] bg-[#1a2332] text-red-500 focus:ring-red-500/50 cursor-pointer"
                          />
                          <div onClick={() => switchFile(f.id)} className="flex items-center gap-2 flex-1 min-w-0">
                            <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${f.isMerged ? 'text-purple-400' : 'text-emerald-400'}`} />
                            <span className="text-sm text-white truncate" title={f.filename}>
                              {displayName}
                            </span>
                            {f.isMerged && (
                              <span className="text-[8px] font-bold text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded flex-shrink-0">MERGED</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 ml-6">
                          <span>{f.recordCount} records</span>
                          <span>•</span>
                          <span>{f.fileSize}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 ml-6">
                          <span className="text-xs text-slate-500">{f.uploadedAt}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (uploadedFiles.length > 0) {
                        switchFile(uploadedFiles[uploadedFiles.length - 1].id);
                      }
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    View latest file →
                  </button>
                  <span className="text-xs text-slate-400">
                    Total: {totalStats.totalRecords} records across {totalStats.totalFiles} files
                    {originalFilesCount > 0 && ` (${originalFilesCount} original)`}
                  </span>
                </div>
              )}
            </div>

            {/* Extraction Complete Stats */}
            {extractionComplete && extractedData.length > 0 && (
              <div className={`${cardClass} rounded-3xl p-8 border-emerald-500/20 animate-in fade-in slide-in-from-bottom-4 duration-700`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                    <div className="relative p-3 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Extraction Complete! 🎉</h3>
                    <p className="text-sm text-slate-400">Your data has been successfully processed and cleaned</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCardDark label="Total rows" value={stats?.total ?? 0} icon={<BarChart3 className="w-4 h-4 text-blue-400" />} color="blue" />
                  <StatCardDark label="Names found" value={stats?.names ?? 0} icon={<User className="w-4 h-4 text-indigo-400" />} color="indigo" />
                  <StatCardDark label="Phones found" value={stats?.phones ?? 0} icon={<Phone className="w-4 h-4 text-emerald-400" />} color="emerald" />
                  <StatCardDark label="Valid emails" value={stats?.validEmails ?? 0} icon={<Mail className="w-4 h-4 text-rose-400" />} color="rose" />
                  <StatCardDark label="Cities found" value={extractedData.filter(r => r.city && r.city.trim() !== '').length} icon={<MapPin className="w-4 h-4 text-purple-400" />} color="purple" />
                  <StatCardDark label="States found" value={extractedData.filter(r => r.state && r.state.trim() !== '').length} icon={<Flag className="w-4 h-4 text-amber-400" />} color="amber" />
                </div>
                <button 
                  onClick={() => setActiveView('results')} 
                  className="mt-8 inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl transition-all shadow-2xl shadow-purple-500/40 hover:shadow-3xl hover:scale-[1.05] active:scale-95"
                >
                  View Results <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          // Results View
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className={`${cardClass} rounded-2xl p-3 border border-[#1e293b]/30`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400 whitespace-nowrap flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" /> Files:
                </span>
                {uploadedFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => switchFile(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                      selectedFileId === f.id
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-[#1a2332] text-slate-400 border border-[#1e293b] hover:border-blue-400/30'
                    }`}
                  >
                    {f.filename.length > 20 ? f.filename.substring(0, 20) + '...' : f.filename} ({f.recordCount})
                    {f.isMerged && ' 🟣'}
                  </button>
                ))}
                {originalFilesCount >= 2 && (
                  <button
                    onClick={mergeAllFiles}
                    disabled={isMerging}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-1 ${
                      isMerging 
                        ? 'bg-[#1e293b] text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    {isMerging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
                    Merge All
                  </button>
                )}
              </div>
            </div>

            {/* Domain & Location Statistics */}
            {extractedData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${cardClass} rounded-2xl p-4 border border-[#1e293b]/30`}>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Email Domain Distribution</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(domainStats).map(([domain, count]) => (
                      <button 
                        key={domain}
                        onClick={() => handleProviderClick(domain)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                          providerFilter === domain ? 'ring-2 ring-blue-400 bg-blue-500/40 text-white' :
                          domain === 'gmail.com' ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' :
                          domain === 'yahoo.com' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30' :
                          domain === 'hotmail.com' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30' :
                          domain === 'outlook.com' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}
                      >
                        {domain}: {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${cardClass} rounded-2xl p-4 border border-[#1e293b]/30`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-white">Top Cities</span>
                    </div>
                    {cityFilter && (
                      <button onClick={() => handleCityClick('')} className="text-[10px] text-purple-400 hover:underline">Clear City</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(cityStats)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([city, count]) => (
                        <button 
                          key={city}
                          onClick={() => handleCityClick(city)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                            cityFilter.toLowerCase() === city.toLowerCase()
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                          }`}
                        >
                          {city || 'Unknown'}: {count}
                        </button>
                      ))}
                  </div>
                </div>

                <div className={`${cardClass} rounded-2xl p-4 border border-[#1e293b]/30`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">State/Country Codes</span>
                    </div>
                    {stateFilter !== 'all' && (
                      <button onClick={() => handleStateClick('all')} className="text-[10px] text-amber-400 hover:underline">Clear State</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stateStats)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([state, count]) => (
                        <button 
                          key={state}
                          onClick={() => handleStateClick(state)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 ${
                            stateFilter.toUpperCase() === state.toUpperCase()
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30 border border-amber-300'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                          }`}
                        >
                          {state || 'Unknown'}: {count}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCardDark label="Total Records" value={extractedData.length} icon={<Database className="w-5 h-5 text-blue-400" />} color="blue" />
              <SummaryCardDark label="Names Found" value={stats?.names ?? 0} icon={<User className="w-5 h-5 text-indigo-400" />} color="indigo" />
              <SummaryCardDark label="Phone Numbers" value={stats?.phones ?? 0} icon={<Phone className="w-5 h-5 text-emerald-400" />} color="emerald" />
              <SummaryCardDark label="Valid Emails" value={stats?.validEmails ?? 0} icon={<Mail className="w-5 h-5 text-rose-400" />} color="rose" />
            </div>

            {/* Toolbar */}
            <div className={`${cardClass} rounded-2xl p-4 border border-[#1e293b]/30 flex flex-wrap items-center gap-3`}>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by name, email, city, state..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition ${inputClass}`}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={providerFilter} 
                  onChange={(e) => setProviderFilter(e.target.value)} 
                  className={`border rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${inputClass}`}
                >
                  <option value="all">All providers ({extractedData.length})</option>
                  <option value="gmail.com">Gmail ({domainStats['gmail.com'] || 0})</option>
                  <option value="yahoo.com">Yahoo ({domainStats['yahoo.com'] || 0})</option>
                  <option value="hotmail.com">Hotmail ({domainStats['hotmail.com'] || 0})</option>
                  <option value="outlook.com">Outlook ({domainStats['outlook.com'] || 0})</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className={`border rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${inputClass}`}
                >
                  <option value="">All Cities ({extractedData.filter(r => r.city).length})</option>
                  {uniqueCities.map(c => (
                    <option key={c} value={c}>
                      {c} ({cityStats[c] || 0})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type city..."
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className={`border rounded-xl px-2.5 py-2.5 text-xs outline-none transition focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${inputClass} w-28`}
                />
              </div>

              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className={`border rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 ${inputClass}`}
                >
                  <option value="all">All States/Codes ({extractedData.filter(r => r.state).length})</option>
                  {uniqueStates.map(st => (
                    <option key={st} value={st}>
                      {st} ({stateStats[st] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {(searchTerm || providerFilter !== 'all' || cityFilter || stateFilter !== 'all') && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5 text-amber-400" /> Reset Filters ({filteredData.length}/{extractedData.length})
                </button>
              )}

              <div className="flex-1"></div>
              
              {uploadedFiles.length > 1 && (
                <button
                  onClick={() => {
                    if (window.confirm('Export all files merged data?')) {
                      const allData: any[] = [];
                      uploadedFiles.forEach(f => {
                        allData.push(...f.data.map(r => ({ ...r, sourceFile: f.filename })));
                      });
                      exportCSV(allData, `merged_all_files_${Date.now()}.csv`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-[1.05] active:scale-95"
                >
                  <Layers className="w-4 h-4" /> Export All
                </button>
              )}
              
              <button 
                onClick={clearAllData}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-[1.05] active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
              
              <button onClick={() => exportCSV()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.05] active:scale-95">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              
              <button onClick={() => exportExcel()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.05] active:scale-95">
                <FileDown className="w-4 h-4" /> Excel
              </button>
            </div>

            {/* Table */}
            <div className={`${cardClass} rounded-2xl border border-[#1e293b]/30 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`${tableHeaderClass} border-b border-[#1e293b]/50`}>
                    <tr>
                      <th className="px-4 py-4 text-left w-8">
                        <input 
                          type="checkbox" 
                          checked={selectedRows.length === paginatedData.length && paginatedData.length > 0} 
                          onChange={toggleAllRows} 
                          className="rounded border-[#1e293b] bg-[#1a2332] text-blue-500 focus:ring-blue-500/50"
                        />
                      </th>
                      {['Name', 'Phone', 'Email', 'City', 'State', 'Domain', 'Source'].map(col => {
                        const key = col.toLowerCase();
                        const isSorted = sortConfig.key === key;
                        return (
                          <th 
                            key={col} 
                            className="px-4 py-4 text-left text-slate-300 font-semibold cursor-pointer hover:text-white transition-colors group"
                            onClick={() => setSortConfig({ key, direction: isSorted && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          >
                            <span className="flex items-center gap-1.5">
                              {col}
                              {isSorted ? (
                                sortConfig.direction === 'asc' ? '↑' : '↓'
                              ) : (
                                <span className="opacity-0 group-hover:opacity-30 transition-opacity">↕</span>
                              )}
                            </span>
                          </th>
                        );
                      })}
                      <th className="px-4 py-4 text-right text-slate-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-slate-400">
                          <div className="flex flex-col items-center">
                            <Database className="w-16 h-16 opacity-10 mb-4" />
                            <p className="font-medium text-white">No data matched</p>
                            <p className="text-sm">Try adjusting your search or filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <tr key={row.email} className={`${tableRowClass} transition-all ${idx % 2 === 0 ? 'bg-[#0f172a]/50' : 'bg-[#111827]/20'}`}>
                          <td className="px-4 py-3.5">
                            <input 
                              type="checkbox" 
                              checked={selectedRows.includes(row.email)} 
                              onChange={() => toggleRowSelection(row.email)} 
                              className="rounded border-[#1e293b] bg-[#1a2332] text-blue-500 focus:ring-blue-500/50"
                            />
                          </td>
                          <td className="px-4 py-3.5 font-medium text-white">{row.name}</td>
                          <td className="px-4 py-3.5 text-slate-300 font-mono text-sm">{row.phone}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300">{row.email}</span>
                              <button 
                                onClick={() => copyToClipboard(row.email)} 
                                className="p-1 text-slate-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-slate-300">{row.city || '—'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                              row.state ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400'
                            }`}>
                              {row.state || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                              row.domain === 'gmail.com' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              row.domain === 'yahoo.com' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              row.domain === 'hotmail.com' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              row.domain === 'outlook.com' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {row.domain || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-slate-400 truncate max-w-[100px] block">
                              {row.sourceFile || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => copyToClipboard(row.phone)} 
                                className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                                title="Copy phone"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteRow(row.email)} 
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                title="Delete row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className={`flex items-center justify-between px-4 py-4 ${isDarkMode ? 'bg-[#0f172a]/50 border-t border-[#1e293b]/50' : 'bg-gradient-to-r from-slate-50/50 to-transparent border-t border-slate-200/50'}`}>
                <span className="text-sm text-slate-400">
                  Showing {totalResults > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, totalResults)} of {totalResults} results
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1 || totalResults === 0} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'border-[#1e293b] text-slate-400 hover:bg-[#1a2332] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-white hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed'}`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className={`px-4 py-1.5 text-sm font-medium rounded-lg border shadow-sm ${isDarkMode ? 'text-white bg-[#1a2332] border-[#1e293b]' : 'text-slate-700 bg-white border-slate-200'}`}>
                    {currentPage} / {totalPages || 1}
                  </span>
                  <button 
                    disabled={currentPage === totalPages || totalPages === 0 || totalResults === 0} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'border-[#1e293b] text-slate-400 hover:bg-[#1a2332] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-white hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed'}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={`border-t ${isDarkMode ? 'border-[#1e293b]/30 bg-[#0f172a]/30' : 'border-slate-200/30 bg-white/30'} py-6 mt-12 backdrop-blur-sm transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg shadow-blue-500/30">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>DataExtract</span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400 bg-[#1e293b]' : 'text-slate-400 bg-slate-100'} px-2 py-0.5 rounded-full`}>v4.1</span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>© 2026 DataExtract — Smart duplicate detection & batch delete</p>
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <a href="#" className={`hover:${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors`}>Privacy</a>
              <a href="#" className={`hover:${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors`}>Terms</a>
              <a href="#" className={`hover:${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors`}>Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCardDark({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: { [key: string]: string } = {
    blue: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
    indigo: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    rose: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} rounded-xl p-3.5 text-center border transition-all hover:shadow-lg hover:scale-[1.02]`}>
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function SummaryCardDark({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: { [key: string]: string } = {
    blue: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20',
    indigo: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20',
    emerald: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    rose: 'bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20',
  };
  return (
    <div className={`bg-[#111827]/80 backdrop-blur-2xl rounded-2xl p-5 border ${colorMap[color] || colorMap.blue} shadow-xl shadow-blue-500/5 transition-all hover:shadow-2xl hover:scale-[1.02]`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#1a2332] rounded-xl shadow-sm backdrop-blur-sm">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs font-medium text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default App;