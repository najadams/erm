'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

import FileSelection from '@/components/upload/FileSelection';
import DocumentMetadata from '@/components/upload/DocumentMetadata';
import AccessControl from '@/components/upload/AccessControl';
import SecurityControl from '@/components/upload/SecurityControl';
import ComplianceControl from '@/components/upload/ComplianceControl';
import ReviewConfirm from '@/components/upload/ReviewConfirm';
import VersioningControl, { Record } from '@/components/upload/VersioningControl';
// Wrapper with Suspense for useSearchParams
export default function UploadPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <UploadPageContent />
    </Suspense>
  );
}

function UploadPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get('companyId');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form State
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
    parentId: '',
    registeredCompanyId: initialCompanyId || ''
  });

  const [access, setAccess] = useState({
    projectId: '',
    departmentId: '',
    sharedUsers: [] as string[],
    sharedGroups: [] as string[],
    shareWithAll: false
  });

  // Security classification (matches schema enum)
  const [security, setSecurity] = useState({
    securityClassification: 'OFFICIAL' as 'OFFICIAL' | 'OFFICIAL_CONFIDENTIAL' | 'RESTRICTED' | 'SECRET'
  });

  const [compliance, setCompliance] = useState({
    isLegalHold: false
  });

  // Mock version info
  const [versionInfo, setVersionInfo] = useState<{ isNewVersion: boolean; version: number } | undefined>(undefined);
  
  // Dynamic Metadata State
  const [template, setTemplate] = useState<any>(null);
  const [dynamicValues, setDynamicValues] = useState<any>({});

  // Versioning State
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [linkedRecord, setLinkedRecord] = useState<Record | null>(null);

  // Internal search state moved to component
  const userRole = (session?.user as any)?.role;
  const [uploadsAllowed, setUploadsAllowed] = useState(true);

  useEffect(() => {
      // Check system setting
      fetch('/api/settings/system')
        .then(res => res.json())
        .then(data => {
            if (data.allowUserUploads !== undefined) setUploadsAllowed(data.allowUserUploads);
        })
        .catch(console.error);
  }, []);

  // ADMIN and RECORDS_OFFICER can bypass upload restrictions (matches backend check)
  const canBypassUploadRestriction = userRole === 'ADMIN' || userRole === 'RECORDS_OFFICER';
  const isUploadBlocked = !uploadsAllowed && !canBypassUploadRestriction;
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
      if (isUploadBlocked) {
          alert('Uploads are currently disabled by the administrator.');
          router.push('/');
      }
  }, [isUploadBlocked, router]);

  const handleFileSelect = (selectedFile: File, fileChecksum: string) => {
    setFile(selectedFile);
    setChecksum(fileChecksum);

    // Auto-fill title if empty
    if (!metadata.title) {
        setMetadata(prev => ({ ...prev, title: selectedFile.name }));
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

  const handleSecurityChange = (field: string, value: string) => {
    setSecurity(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('checksum', checksum);
    
    // Core Fields
    if (metadata.registeredCompanyId) {
        formData.append('registeredCompanyId', metadata.registeredCompanyId);
    }

    // Append Metadata
    Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    // Append Access
    formData.append('sharedUsers', JSON.stringify(access.sharedUsers));
    formData.append('sharedGroups', JSON.stringify(access.sharedGroups));
    formData.append('shareWithAll', String(access.shareWithAll));

    // Project context (new Project model)
    if (access.projectId) {
        formData.append('projectId', access.projectId);
    }

    // Department assignment
    if (access.departmentId) {
        formData.append('departmentId', access.departmentId);
    }

    // Security Classification
    formData.append('securityClassification', security.securityClassification);

    // Compliance
    formData.append('isLegalHold', String(compliance.isLegalHold));
    
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
            const data = await res.json().catch(() => ({ error: 'Upload failed' }));
            setUploadError(data.error || 'Upload failed. Please try again.');
            console.error('Upload failed:', data);
        }
    } catch (error) {
        console.error('Error uploading:', error);
        setUploadError('An unexpected error occurred. Please try again.');
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
        selectedCompanyId={metadata.registeredCompanyId}
        onCompanySelect={(id) => handleMetadataChange('registeredCompanyId', id || '')}
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

            <SecurityControl
                data={security}
                onChange={handleSecurityChange}
                userClearanceLevel={(session?.user as any)?.clearanceLevel ?? 1}
            />

            <ComplianceControl
                data={compliance}
                onChange={handleComplianceChange}
                isAdmin={isAdmin}
            />

            {uploadError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
                    {uploadError}
                </Alert>
            )}

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
