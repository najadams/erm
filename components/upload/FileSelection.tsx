'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';


// Match Prisma ClassificationNode partially
export interface ClassificationNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  isLeaf: boolean;
}

interface FileSelectionProps {
  onFileSelect: (file: File, checksum: string) => void;
  // New prop signature
  onClassificationSelect?: (node: ClassificationNode) => void;
  existingFileError?: string | null;
}

export default function FileSelection({ onFileSelect, onClassificationSelect }: FileSelectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checksum, setChecksum] = useState<string>('');

  // Classification State (3 Levels)
  const [level1Nodes, setLevel1Nodes] = useState<ClassificationNode[]>([]);
  const [level2Nodes, setLevel2Nodes] = useState<ClassificationNode[]>([]);
  const [level3Nodes, setLevel3Nodes] = useState<ClassificationNode[]>([]);

  const [selectedLevel1, setSelectedLevel1] = useState<string>('');
  const [selectedLevel2, setSelectedLevel2] = useState<string>('');
  const [selectedLevel3, setSelectedLevel3] = useState<string>('');

  const [loadingLevel1, setLoadingLevel1] = useState(false);
  const [loadingLevel2, setLoadingLevel2] = useState(false);
  const [loadingLevel3, setLoadingLevel3] = useState(false);

  // Fetch helper
  const fetchNodes = async (level: number, parentId: string | null = null) => {
    const params = new URLSearchParams();
    params.append('level', level.toString());
    if (parentId) params.append('parentId', parentId);
    
    const res = await fetch(`/api/classifications?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch classifications');
    return res.json();
  };

  // Initial Fetch (Level 1)
  useEffect(() => {
    setLoadingLevel1(true);
    fetchNodes(1)
      .then(data => setLevel1Nodes(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingLevel1(false));
  }, []);

  // Handlers
  const handleLevel1Change = async (nodeId: string) => {
    setSelectedLevel1(nodeId);
    setSelectedLevel2('');
    setSelectedLevel3('');
    setLevel2Nodes([]);
    setLevel3Nodes([]);
    
    setLoadingLevel2(true);
    try {
      const children = await fetchNodes(2, nodeId);
      setLevel2Nodes(children);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevel2(false);
    }
  };

  const handleLevel2Change = async (nodeId: string) => {
    setSelectedLevel2(nodeId);
    setSelectedLevel3('');
    setLevel3Nodes([]);

    setLoadingLevel3(true);
    try {
      const children = await fetchNodes(3, nodeId);
      setLevel3Nodes(children);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevel3(false);
    }
  };

  const handleLevel3Change = (nodeId: string) => {
    setSelectedLevel3(nodeId);
    
    if (onClassificationSelect) {
      const node = level3Nodes.find(n => n.id === nodeId);
      if (node) onClassificationSelect(node);
    }
  };

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
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>1. Classification</Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {/* Level 1 */}
        <Box sx={{ flex: '1 1 300px' }}>
          <FormControl fullWidth disabled={loadingLevel1}>
            <InputLabel>Function (Level 1)</InputLabel>
            <Select
              value={selectedLevel1}
              label="Function (Level 1)"
              onChange={(e) => handleLevel1Change(e.target.value)}
            >
              {level1Nodes.map((node) => (
                <MenuItem key={node.id} value={node.id}>{node.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Level 2 */}
        <Box sx={{ flex: '1 1 300px' }}>
          <FormControl fullWidth disabled={!selectedLevel1 || loadingLevel2}>
            <InputLabel>Activity (Level 2)</InputLabel>
            <Select
              value={selectedLevel2}
              label="Activity (Level 2)"
              onChange={(e) => handleLevel2Change(e.target.value)}
            >
              {level2Nodes.map((node) => (
                <MenuItem key={node.id} value={node.id}>{node.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Level 3 */}
        <Box sx={{ flex: '1 1 300px' }}>
          <FormControl fullWidth disabled={!selectedLevel2 || loadingLevel3}>
            <InputLabel>Record Type (Level 3)</InputLabel>
            <Select
              value={selectedLevel3}
              label="Record Type (Level 3)"
              onChange={(e) => handleLevel3Change(e.target.value)}
            >
              {level3Nodes.map((node) => (
                <MenuItem key={node.id} value={node.id}>{node.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom>2. File Upload</Typography>
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 4, 
          borderStyle: 'dashed', 
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          opacity: selectedLevel3 ? 1 : 0.5,
          pointerEvents: selectedLevel3 ? 'auto' : 'none'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => selectedLevel3 && document.getElementById('file-input')?.click()}
      >
        <input 
          id="file-input"
          type="file" 
          style={{ display: 'none' }} 
          onChange={(e) => handleFiles(e.target.files)}
          disabled={!selectedLevel3}
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
              <CloudUploadIcon color={selectedLevel3 ? "primary" : "disabled"} sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">
                {selectedLevel3 ? "Drag & Drop File Here" : "Select Record Type above"}
              </Typography>
              {selectedLevel3 && (
                <Typography variant="body2" color="text.secondary">
                    or click to browse
                </Typography>
              )}
          </React.Fragment>
        )}
      </Paper>
    </Box>
  );
}
