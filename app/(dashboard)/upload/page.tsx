'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';

import FileSelection from '@/components/upload/FileSelection';
import DocumentMetadata from '@/components/upload/DocumentMetadata';
import AccessControl from '@/components/upload/AccessControl';
import ComplianceControl from '@/components/upload/ComplianceControl';
import ReviewConfirm from '@/components/upload/ReviewConfirm';

interface Record {
    id: string;
    title: string;
    referenceNumber: string;
    status: string;
    versionNumber: number;
    classificationNode?: {
        name: string;
        code: string;
    };
    isLatest: boolean;
}



export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [checksum, setChecksum] = useState<string>('');
  
  const [metadata, setMetadata] = useState({
    type: '',
    title: '',
    description: '', // Added description
    department: '',
    tags: '',
    category: '', // Legacy/Internal
    effectiveDate: '',
    retentionPeriod: '',
    classificationNodeId: '',
    parentId: ''
  });

  const [access, setAccess] = useState({
    visibility: 'PRIVATE',
    projectId: '',
    sharedUsers: [] as string[],
    sharedGroups: [] as string[]
  });

  const [compliance, setCompliance] = useState({
    isLegalHold: false,
    requiresApproval: false
  });

  // Mock version info
  const [versionInfo, setVersionInfo] = useState<{ isNewVersion: boolean; version: number } | undefined>(undefined);
  
  // Dynamic Metadata State
  const [template, setTemplate] = useState<any>(null);
  const [dynamicValues, setDynamicValues] = useState<any>({});

  // Versioning State
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [linkedRecord, setLinkedRecord] = useState<Record | null>(null);
  const [recordSearchQuery, setRecordSearchQuery] = useState('');
  const [recordOptions, setRecordOptions] = useState<Record[]>([]);
  const [searchingRecords, setSearchingRecords] = useState(false);

  // Search Effect
  React.useEffect(() => {
      if (!isVersionMode || recordSearchQuery.length < 2) {
          setRecordOptions([]);
          return;
      }

      const timer = setTimeout(async () => {
          setSearchingRecords(true);
          try {
              // Construct Search URL
              let url = `/api/records/search?q=${encodeURIComponent(recordSearchQuery)}`;
              
              // Filter by classification if selected (Pragmatic Default)
              if (metadata.classificationNodeId) {
                  url += `&classificationNodeId=${metadata.classificationNodeId}`;
              }

              const res = await fetch(url);
              if (res.ok) {
                  const data = await res.json();
                  setRecordOptions(data);
              }
          } catch (e) {
              console.error('Search failed', e);
          } finally {
              setSearchingRecords(false);
          }
      }, 300);

      return () => clearTimeout(timer);
  }, [recordSearchQuery, isVersionMode, metadata.classificationNodeId]);

  const handleFileSelect = (selectedFile: File, fileChecksum: string) => {
    setFile(selectedFile);
    setChecksum(fileChecksum);
    
    // Auto-fill title if empty
    if (!metadata.title) {
        setMetadata(prev => ({ ...prev, title: selectedFile.name }));
    }
    
    // Simulate API check for version
    // In real implementation: fetch('/api/check-version', { checksum })...
    // Mocking finding a duplicate for demonstration if filename contains "v2"
    if (selectedFile.name.includes('v2')) {
        setVersionInfo({ isNewVersion: true, version: 2 });
    } else {
        setVersionInfo(undefined);
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleAccessChange = (field: string, value: any) => {
    setAccess(prev => ({ ...prev, [field]: value }));
  };

  const handleComplianceChange = (field: string, value: boolean) => {
    setCompliance(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('checksum', checksum);
    
    // Append Metadata
    Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    // Append Access
    formData.append('visibility', access.visibility);
    formData.append('sharedUsers', JSON.stringify(access.sharedUsers));
    formData.append('sharedUsers', JSON.stringify(access.sharedUsers));
    formData.append('sharedGroups', JSON.stringify(access.sharedGroups));
    
    // Map Project Context -> groupId (Backend expects primary group as Project)
    if (access.projectId) {
        formData.append('groupId', access.projectId);
    }
    
    // Append Compliance
    // Append Compliance
    formData.append('isLegalHold', String(compliance.isLegalHold));
    formData.append('isLegalHold', String(compliance.isLegalHold));
    formData.append('requiresApproval', String(compliance.requiresApproval));
    
    // Append Parent ID
    if (metadata.parentId) {
        formData.append('parentId', metadata.parentId);
    }

    // Append Classification & Dynamic Metadata
    if (template) {
        formData.append('classificationNodeId', metadata.classificationNodeId);
        formData.append('templateVersion', template.version.toString());
        
        const metadataPayload: any = {};
        template.templateFields.forEach((tf: any) => {
          const fieldId = tf.metadataFieldId;
          const val = dynamicValues[fieldId];
          if (val !== undefined && val !== null && val !== '') {
            metadataPayload[fieldId] = val;
          }
        });
        
        // Merge with legacy if needed, or just send payload
        formData.append('metadata', JSON.stringify(metadataPayload));
    } else {
        // Fallback for legacy static fields
        formData.append('classificationNodeId', metadata.classificationNodeId);
        // Map static fields to something? Or just leave as top level fields if API handles them.
        // Assuming API might look at 'metadata' json now.
    }

    if (isVersionMode && linkedRecord) {
        formData.append('linkedRecordId', linkedRecord.id);
    }

    try {
        const res = await fetch('/api/records', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            router.push('/');
        } else {
            alert('Upload failed (mock)');
            // For now, since DB migration failed, this will fail.
            // But UI flow is demonstrated.
            console.error('Upload failed', await res.text());
        }
    } catch (error) {
        console.error('Error uploading:', error);
    } finally {
        setUploading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => router.push('/')}
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>
      
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
        Upload Document
      </Typography>

      {/* Versioning Toggle Section */}
      <Typography variant="h6" gutterBottom>0. Version Control</Typography>
      <Box sx={{ mb: 4, p: 3, border: '1px solid #ccc', borderRadius: 2, bgcolor: '#f5f5f5' }}>
          <FormControlLabel 
              control={
                  <Switch 
                      checked={isVersionMode} 
                      onChange={(e) => {
                          setIsVersionMode(e.target.checked);
                          if (!e.target.checked) setLinkedRecord(null);
                      }} 
                      color="primary"
                  />
              } 
              label={<Typography fontWeight="bold" color="text.primary">Is this a new version of an existing record?</Typography>} 
          />
          
          {isVersionMode && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
                  <Autocomplete
                      value={linkedRecord}
                      options={recordOptions}
                      getOptionLabel={(option) => {
                          // Handle case where option is a string (freeSolo?) or null
                          if (typeof option === 'string') return option;
                          return `${option.referenceNumber || 'No Ref'} - ${option.title}`;
                      }}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      filterOptions={(x) => x} // Disable local filter, rely on API
                      loading={searchingRecords}
                      onInputChange={(_, val) => setRecordSearchQuery(val)}
                      onChange={(_, newVal) => {
                          setLinkedRecord(newVal);
                          if (newVal) {
                              if (!metadata.title) {
                                  handleMetadataChange('title', newVal.title);
                              }
                          }
                      }}
                      renderInput={(params) => (
                          <TextField 
                              {...params} 
                              label="Search original record to link..." 
                              placeholder="Type title or reference number (e.g. INV)"
                              helperText={metadata.classificationNodeId ? "Searching within selected classification..." : "Searching all records..."}
                              fullWidth
                          />
                      )}
                      renderOption={(props, option) => (
                          <li {...props} key={option.id}>
                              <Box sx={{ width: '100%' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="subtitle2" component="span" fontWeight="bold">
                                        {option.referenceNumber}
                                      </Typography>
                                      <Chip 
                                        size="small" 
                                        label={`v${option.versionNumber}`} 
                                        color={option.isLatest ? "primary" : "default"} 
                                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                                      />
                                  </Box>
                                  <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
                                    {option.title}
                                  </Typography>
                              </Box>
                          </li>
                      )}
                  />
                  {linkedRecord && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #1976d2' }}>
                          <Typography variant="body2" color="primary" fontWeight="bold">
                              ✓ Will create new version for:
                          </Typography>
                          <Typography variant="body2">
                              {linkedRecord.title} (v{linkedRecord.versionNumber} → v{linkedRecord.versionNumber + 1})
                          </Typography>
                      </Box>
                  )}
              </Box>
          )}
      </Box>

      <FileSelection 
        onFileSelect={handleFileSelect} 
        description={metadata.description}
        onDescriptionChange={(val) => handleMetadataChange('description', val)}
        onClassificationSelect={(nodeWithTemplate) => {
            // Update metadata with classification info
            setMetadata(prev => ({
                ...prev,
                classificationNodeId: nodeWithTemplate.id,
            }));
            
            // Check for template
            if (nodeWithTemplate.template) {
                console.log('Selected Template:', nodeWithTemplate.template);
                setTemplate(nodeWithTemplate.template);
                setDynamicValues({}); // Reset values when template changes
            } else {
                setTemplate(null);
            }
        }} 
      />
      
      {file && (
        <React.Fragment>
            <DocumentMetadata 
                data={metadata} 
                onChange={handleMetadataChange} 
                versionInfo={versionInfo}
                template={template}
                dynamicValues={dynamicValues}
                onDynamicChange={(fieldId, val) => setDynamicValues((prev: any) => ({ ...prev, [fieldId]: val }))}
            />
            
            <AccessControl 
                data={access} 
                onChange={handleAccessChange} 
            />
            
            <ComplianceControl 
                data={compliance} 
                onChange={handleComplianceChange} 
            />
            
            <ReviewConfirm 
                data={{ file, metadata, access, compliance, versionInfo }}
                onCancel={() => router.push('/')}
                onUpload={handleUpload}
                uploading={uploading}
            />
        </React.Fragment>
      )}
    </Container>
  );
}
