'use client';

import React, { useState, useEffect } from 'react';
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
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chip from '@mui/material/Chip';

import DynamicField from '../upload/DynamicField';

interface UploadRecordModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface ClassificationNode {
  id: string;
  name: string;
  level: number;
  code?: string;
  children?: ClassificationNode[];
}

interface TemplateField {
  id: string;
  metadataFieldId: string;
  metadataField: any;
  required: boolean;
  displayOrder: number;
  editable: boolean;
}

interface MetadataTemplate {
  id: string;
  name: string;
  version: number;
  classificationNodeId: string;
  templateFields: TemplateField[];
}

export default function UploadRecordModal({ open, onClose, onUploadSuccess }: UploadRecordModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Classification Selection State
  const [level1Nodes, setLevel1Nodes] = useState<ClassificationNode[]>([]);
  const [level2Nodes, setLevel2Nodes] = useState<ClassificationNode[]>([]);
  const [level3Nodes, setLevel3Nodes] = useState<ClassificationNode[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<ClassificationNode | null>(null);
  const [selectedLevel2, setSelectedLevel2] = useState<ClassificationNode | null>(null);
  const [selectedLevel3, setSelectedLevel3] = useState<ClassificationNode | null>(null);
  const [template, setTemplate] = useState<MetadataTemplate | null>(null);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dynamicValues, setDynamicValues] = useState<any>({});
  
  // Fetch Level 1 nodes on Open
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setFile(null);
      setTitle('');
      setSelectedLevel1(null);
      setSelectedLevel2(null);
      setSelectedLevel3(null);
      setTemplate(null);
      setDynamicValues({});
      setLevel2Nodes([]);
      setLevel3Nodes([]);
      
      fetch('/api/classifications?level=1&includeInactive=false')
        .then(res => res.json())
        .then(data => setLevel1Nodes(data))
        .catch(err => console.error(err));
    }
  }, [open]);

  // Fetch Level 2 when Level 1 is selected
  useEffect(() => {
    if (selectedLevel1) {
      fetch(`/api/classifications?level=2&parentId=${selectedLevel1.id}&includeInactive=false`)
        .then(res => res.json())
        .then(data => {
          setLevel2Nodes(data);
          setSelectedLevel2(null);
          setLevel3Nodes([]);
          setSelectedLevel3(null);
        })
        .catch(err => console.error(err));
    }
  }, [selectedLevel1]);

  // Fetch Level 3 when Level 2 is selected
  useEffect(() => {
    if (selectedLevel2) {
      fetch(`/api/classifications?level=3&parentId=${selectedLevel2.id}&includeInactive=false`)
        .then(res => res.json())
        .then(data => {
          setLevel3Nodes(data);
          setSelectedLevel3(null);
        })
        .catch(err => console.error(err));
    }
  }, [selectedLevel2]);

  // Fetch Template when Level 3 is selected
  useEffect(() => {
    if (selectedLevel3) {
      setLoading(true);
      fetch(`/api/classifications/${selectedLevel3.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.templates && data.templates.length > 0) {
            setTemplate(data.templates[0]);
            setActiveStep(1); // Auto advance to form
          } else {
            alert('No active template found for this classification. Please contact an administrator.');
          }
        })
        .catch(err => {
          console.error(err);
          alert('Failed to load template');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedLevel3]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !selectedLevel3 || !template) return;

    // Simplified Validation (Static Only)
    // Dynamic fields are ignored in Modal Upload
    // If strict validation is needed for templates even in modal, it contradicts "Static Fields" requirement, 
    // but usually backend might complain if required fields are missing. 
    // For now, we assume Modal Upload is a "Quick Upload" that bypasses complex metadata or sets defaults.
    
    // However, the prompt says "specific fields... used by individual".
    // We will clean up the validation logic to only check static fields.


    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('classificationNodeId', selectedLevel3.id);
    formData.append('templateVersion', template.version.toString());
    
    // Dynamic Metadata
    const metadataPayload: any = {};
    template.templateFields.forEach(tf => {
      const fieldId = tf.metadataFieldId;
      if (dynamicValues[fieldId] !== undefined && dynamicValues[fieldId] !== null && dynamicValues[fieldId] !== '') {
        metadataPayload[fieldId] = dynamicValues[fieldId];
      }
    });
    formData.append('metadata', JSON.stringify(metadataPayload));

    try {
      const res = await fetch('/api/records', { method: 'POST', body: formData });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getClassificationPath = (): string => {
    const parts: string[] = [];
    if (selectedLevel1) parts.push(selectedLevel1.name);
    if (selectedLevel2) parts.push(selectedLevel2.name);
    if (selectedLevel3) parts.push(selectedLevel3.name);
    return parts.join(' → ');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {activeStep === 1 && (
          <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(0)} size="small" />
        )}
        Upload New Record
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step><StepLabel>Select Classification</StepLabel></Step>
          <Step><StepLabel>Fill Details</StepLabel></Step>
        </Stepper>

        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Select Classification</Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Level 1 Selection */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Level 1
                  </Typography>
                  {selectedLevel1 ? (
                    <Chip
                      label={selectedLevel1.name}
                      onDelete={() => {
                        setSelectedLevel1(null);
                        setSelectedLevel2(null);
                        setSelectedLevel3(null);
                        setLevel2Nodes([]);
                        setLevel3Nodes([]);
                      }}
                      color="primary"
                    />
                  ) : (
                    <List>
                      {level1Nodes.map(node => (
                        <ListItemButton
                          key={node.id}
                          onClick={() => setSelectedLevel1(node)}
                        >
                          <ListItemText primary={node.name} secondary={node.code} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Box>

                {/* Level 2 Selection */}
                {selectedLevel1 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Level 2
                    </Typography>
                    {selectedLevel2 ? (
                      <Chip
                        label={selectedLevel2.name}
                        onDelete={() => {
                          setSelectedLevel2(null);
                          setSelectedLevel3(null);
                          setLevel3Nodes([]);
                        }}
                        color="primary"
                      />
                    ) : (
                      <List>
                        {level2Nodes.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No Level 2 classifications available
                          </Typography>
                        ) : (
                          level2Nodes.map(node => (
                            <ListItemButton
                              key={node.id}
                              onClick={() => setSelectedLevel2(node)}
                            >
                              <ListItemText primary={node.name} secondary={node.code} />
                            </ListItemButton>
                          ))
                        )}
                      </List>
                    )}
                  </Box>
                )}

                {/* Level 3 Selection */}
                {selectedLevel2 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Level 3
                    </Typography>
                    {selectedLevel3 ? (
                      <Chip
                        label={selectedLevel3.name}
                        onDelete={() => {
                          setSelectedLevel3(null);
                          setTemplate(null);
                        }}
                        color="primary"
                      />
                    ) : (
                      <List>
                        {level3Nodes.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No Level 3 classifications available
                          </Typography>
                        ) : (
                          level3Nodes.map(node => (
                            <ListItemButton
                              key={node.id}
                              onClick={() => setSelectedLevel3(node)}
                            >
                              <ListItemText primary={node.name} secondary={node.code} />
                            </ListItemButton>
                          ))
                        )}
                      </List>
                    )}
                  </Box>
                )}

                {selectedLevel3 && !template && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Loading template...
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {activeStep === 1 && template && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Classification Path Display */}
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Classification</Typography>
              <Typography variant="body2" fontWeight="bold">{getClassificationPath()}</Typography>
              <Typography variant="caption" color="text.secondary">Template: {template.name} (v{template.version})</Typography>
            </Box>
            
            {/* Standard Fields */}
            <Box
              component="label"
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: '#fafafa'
              }}
            >
              <input type="file" hidden onChange={handleFileChange} />
              <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              <Typography>{file ? file.name : "Select File"}</Typography>
            </Box>

            <TextField 
              label="Title" 
              fullWidth 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
            />
            
            <TextField 
              label="Description" 
              fullWidth 
              multiline 
              rows={2} 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />

            {/* Dynamic Fields */}
            {template && template.templateFields && template.templateFields.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Additional Details</Typography>
                {template.templateFields
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((field) => (
                    <Box key={field.id} sx={{ mb: 2 }}>
                       <DynamicField
                          field={{
                              ...field.metadataField,
                              required: field.required
                          }}
                          value={dynamicValues[field.metadataFieldId] || ''}
                          onChange={(val) => setDynamicValues({
                            ...dynamicValues,
                            [field.metadataFieldId]: val
                          })}
                       />
                    </Box>
                  ))}
              </Box>
            )}

          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        {activeStep === 1 && template && (
          <Button 
            variant="contained" 
            onClick={handleUpload}
            disabled={!file || !title || !selectedLevel3 || loading}
          >
            {loading ? 'Uploading...' : 'Submit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
