'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import FileSelection from '../upload/FileSelection';
import DocumentMetadata from '../upload/DocumentMetadata';
import AccessControl from '../upload/AccessControl';
import ComplianceControl from '../upload/ComplianceControl';
import VersioningControl, { Record } from '../upload/VersioningControl';

interface UploadRecordModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadRecordModal({ open, onClose, onUploadSuccess }: UploadRecordModalProps) {
  const { data: session } = useSession();
  const [activeStep, setActiveStep] = useState(0);
  const [uploading, setUploading] = useState(false);

  // --- State Replicated from UploadPage ---
  const [file, setFile] = useState<File | null>(null);
  const [checksum, setChecksum] = useState<string>('');
  
  const [metadata, setMetadata] = useState({
    type: '',
    title: '',
    description: '',
    department: '',
    tags: '',
    category: '',
    effectiveDate: '',
    retentionPeriod: '',
    classificationNodeId: '',
    parentId: ''
  });

  const [access, setAccess] = useState({
    visibility: 'PRIVATE',
    projectId: '',
    departmentId: '',
    sharedUsers: [] as string[],
    sharedGroups: [] as string[]
  });

  const [compliance, setCompliance] = useState({
    isLegalHold: false,
    requiresApproval: false
  });

  const [versionInfo, setVersionInfo] = useState<{ isNewVersion: boolean; version: number } | undefined>(undefined);
  const [template, setTemplate] = useState<any>(null);
  const [dynamicValues, setDynamicValues] = useState<any>({});

  // Versioning
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [linkedRecord, setLinkedRecord] = useState<Record | null>(null);

  // --- Reset when opening ---
  React.useEffect(() => {
    if (open) {
        setActiveStep(0);
        setFile(null);
        setChecksum('');
        setMetadata({
            type: '', title: '', description: '', department: '', tags: '', category: '', effectiveDate: '', retentionPeriod: '', classificationNodeId: '', parentId: ''
        });
        const userDeptId = (session?.user as any)?.departmentId || '';
        setAccess({ visibility: 'PRIVATE', projectId: '', departmentId: userDeptId, sharedUsers: [], sharedGroups: [] });
        setCompliance({ isLegalHold: false, requiresApproval: false });
        setVersionInfo(undefined);
        setTemplate(null);
        setDynamicValues({});
        setIsVersionMode(false);
        setLinkedRecord(null);
        setUploading(false);
    }
  }, [open]);

  // --- Handlers ---
  const handleMetadataChange = (field: string, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('checksum', checksum);
    Object.entries(metadata).forEach(([key, value]) => formData.append(key, value));
    
    // Access
    formData.append('visibility', access.visibility);
    formData.append('sharedUsers', JSON.stringify(access.sharedUsers));
    formData.append('sharedGroups', JSON.stringify(access.sharedGroups));
    if (access.projectId) formData.append('groupId', access.projectId);
    if (access.departmentId) formData.append('departmentId', access.departmentId);

    // Compliance
    formData.append('isLegalHold', String(compliance.isLegalHold));
    formData.append('requiresApproval', String(compliance.requiresApproval));

    // Dynamic Metadata
    if (template) {
        formData.append('templateVersion', template.version.toString());
        const metadataPayload: any = {};
        template.templateFields.forEach((tf: any) => {
          const fieldId = tf.metadataFieldId;
          const val = dynamicValues[fieldId];
          if (val !== undefined && val !== null && val !== '') {
            metadataPayload[fieldId] = val;
          }
        });
        formData.append('metadata', JSON.stringify(metadataPayload));
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
            onUploadSuccess();
            onClose();
        } else {
            const errorText = await res.text();
            console.error('Upload failed', errorText);
            alert('Upload failed: ' + errorText);
        }
    } catch (error) {
        console.error('Error uploading:', error);
        alert('Error uploading file');
    } finally {
        setUploading(false);
    }
  };

  const isStep0Valid = () => {
    // Need file and classification
    return !!file && !!metadata.classificationNodeId;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload New Record</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step><StepLabel>File & Classification</StepLabel></Step>
          <Step><StepLabel>Details & Settings</StepLabel></Step>
        </Stepper>

        <Box sx={{ mt: 2 }}>
            {activeStep === 0 && (
                <React.Fragment>
                    {/* Reuse Versioning Control */}
                    <VersioningControl
                        isVersionMode={isVersionMode}
                        onVersionModeChange={(checked) => {
                            setIsVersionMode(checked);
                            if (!checked) setLinkedRecord(null);
                        }}
                        linkedRecord={linkedRecord}
                        onLinkedRecordChange={(newVal) => {
                            setLinkedRecord(newVal);
                            if (newVal && !metadata.title) {
                                handleMetadataChange('title', newVal.title);
                            }
                        }}
                        classificationNodeId={metadata.classificationNodeId}
                    />

                    {/* Reuse File Selection */}
                    <FileSelection 
                        onFileSelect={(selectedFile, fileChecksum) => {
                            setFile(selectedFile);
                            setChecksum(fileChecksum);
                            if (!metadata.title) handleMetadataChange('title', selectedFile.name);
                        }}
                        description={metadata.description}
                        onDescriptionChange={(val) => handleMetadataChange('description', val)}
                        onClassificationSelect={(nodeWithTemplate) => {
                            setMetadata(prev => ({ ...prev, classificationNodeId: nodeWithTemplate.id }));
                            if (nodeWithTemplate.template) {
                                setTemplate(nodeWithTemplate.template);
                                setDynamicValues({});
                            } else {
                                setTemplate(null);
                            }
                        }}
                    />
                </React.Fragment>
            )}

            {activeStep === 1 && (
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
                        onChange={(field, value) => setAccess(prev => ({ ...prev, [field]: value }))} 
                    />
                    
                    <ComplianceControl 
                        data={compliance} 
                        onChange={(field, value) => setCompliance(prev => ({ ...prev, [field]: value }))} 
                    />
                </React.Fragment>
            )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        {activeStep === 1 && (
             <Button onClick={() => setActiveStep(0)}>Back</Button>
        )}
        {activeStep === 0 ? (
            <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!isStep0Valid()}>
                Next
            </Button>
        ) : (
            <Button variant="contained" onClick={handleUpload} disabled={uploading}>
                {uploading ? <CircularProgress size={24} /> : 'Submit Upload'}
            </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
