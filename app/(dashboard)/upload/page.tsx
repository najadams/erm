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

import FileSelection from '@/components/upload/FileSelection';
import DocumentMetadata from '@/components/upload/DocumentMetadata';
import AccessControl from '@/components/upload/AccessControl';
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
    parentId: '',
    registeredCompanyId: initialCompanyId || '' // New field
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

  const isUploadBlocked = !uploadsAllowed && userRole !== 'ADMIN';

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
    
    // Core Fields
    if (metadata.registeredCompanyId) {
        formData.append('registeredCompanyId', metadata.registeredCompanyId);
    }

    // Append Metadata
    Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    // Append Access
    formData.append('visibility', access.visibility);
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
