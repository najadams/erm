'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Alert from '@mui/material/Alert';

interface FileSelectionProps {
  onFileSelect: (file: File, checksum: string) => void;
  existingFileError?: string | null; // If passed, shows "File exists"
}

export default function FileSelection({ onFileSelect }: FileSelectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checksum, setChecksum] = useState<string>('');

  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFiles = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setLoading(true);
      try {
        const hash = await calculateChecksum(file);
        setChecksum(hash);
        setSelectedFile(file);
        onFileSelect(file, hash);
      } catch (e) {
        console.error("Checksum error", e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 4, 
        mb: 3, 
        borderStyle: 'dashed', 
        borderColor: dragActive ? 'primary.main' : 'divider',
        bgcolor: dragActive ? 'action.hover' : 'background.paper',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input 
        id="file-input"
        type="file" 
        style={{ display: 'none' }} 
        onChange={(e) => handleFiles(e.target.files)}
      />
      
      {loading ? (
        <React.Fragment>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>Computing Checksum...</Typography>
        </React.Fragment>
      ) : selectedFile ? (
        <React.Fragment>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h6">{selectedFile.name}</Typography>
            <Typography variant="caption" color="text.secondary">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {checksum.substring(0, 8)}...
            </Typography>
        </React.Fragment>
      ) : (
        <React.Fragment>
            <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h6">Drag & Drop File Here</Typography>
            <Typography variant="body2" color="text.secondary">
                or click to browse
            </Typography>
        </React.Fragment>
      )}
    </Paper>
  );
}
