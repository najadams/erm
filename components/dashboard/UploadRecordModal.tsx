'use client';

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';

interface UploadRecordModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const CATEGORIES = ['Finance', 'HR', 'Engineering', 'Marketing', 'Legal', 'Operations'];

export default function UploadRecordModal({ open, onClose, onUploadSuccess }: UploadRecordModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      setFile(null);
      setFormData({ title: '', category: '', description: '', tags: '' });
      setLoading(false);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-fill title if empty
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: selectedFile.name }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !formData.title || !formData.category) return;

    const data = new FormData();
    data.append('file', file);
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('description', formData.description);
    data.append('tags', formData.tags);

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) throw new Error('Upload failed');

      console.log('Upload success');
      onUploadSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Failed to upload record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Upload New Record</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          
          {/* File Drop Zone (simplified) */}
          <Box
            sx={{
              border: '2px dashed #cbd5e1',
              borderRadius: 3,
              p: 4,
              textAlign: 'center',
              bgcolor: '#f8fafc',
              cursor: 'pointer',
              '&:hover': { borderColor: 'secondary.main', bgcolor: '#f0f9ff' },
              transition: 'all 0.2s',
            }}
            component="label"
          >
            <input
              type="file"
              hidden
              onChange={handleFileChange}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography fontWeight="500">
              {file ? file.name : 'Click or Drag file to upload'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PDF, DOCX, XLSX up to 10MB
            </Typography>
          </Box>

          <TextField
            label="Document Title"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <TextField
            select
            label="Category"
            fullWidth
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            {CATEGORIES.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <TextField
            label="Tags (comma separated)"
            fullWidth
            placeholder="e.g. invoice, urgent, 2025"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="secondary" 
          disabled={!file || !formData.title || !formData.category || loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Uploading...' : 'Upload Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
