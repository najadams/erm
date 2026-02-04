'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Tooltip from '@mui/material/Tooltip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GavelIcon from '@mui/icons-material/Gavel';
import RestoreIcon from '@mui/icons-material/Restore';

// Dialogs
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import UserSearch from '@/components/UserSearch'; // Assuming this exists or using simple text field for now

export default function RecordDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = React.use(props.params);
  const router = useRouter();
  const { data: session } = useSession();
  const { id } = params;

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [limitedInfo, setLimitedInfo] = useState<any>(null); // For restricted view
  
  // Dialog States
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [uploading, setUploading] = useState(false);

  // Access Request State
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestLevel, setRequestLevel] = useState('VIEW');
  const [requestScope, setRequestScope] = useState('RECORD');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);

  // Access Grant State
  const [openAccessDialog, setOpenAccessDialog] = useState(false);
  const [accessForm, setAccessForm] = useState({
      principalType: 'USER',
      principalId: '',
      level: 'VIEW',
      accessType: 'ALLOW'
  });

  // Tab State
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  /* Removed manual Fetch effect in favor of SWR */

  // SWR Fetcher
  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  // SWR Hook for auto-refresh (Smart Polling every 5s if focused)
  const { data: recordData, error, mutate } = useSWR(`/api/records/${id}`, fetcher, {
      refreshInterval: 5000,
      revalidateOnFocus: true
  });

  useEffect(() => {
    if (recordData) {
        if (recordData.error) {
           // Handle API errors like 403 or 404 embedded in response if structure differs
           // But normally fetcher throws or returns data.
           // Our API usually returns { record: ..., existingRequest: ... } or { error: ... }
           if(recordData.status === 403 || recordData.error === 'Access Restricted') {
               setAccessDenied(true);
               setLimitedInfo(recordData.record); // Assuming API sends limited info in this case
               setExistingRequest(recordData.existingRequest);
           } else {
               setRecord(recordData);
               setAccessDenied(false);
               setExistingRequest(recordData.existingRequest);
           }
           setLoading(false);
        } else {
            setRecord(recordData);
            setAccessDenied(false);
            setExistingRequest(recordData.existingRequest);
            setLoading(false);
        }
    } else if (error) {
        // Handle fetch errors (network etc)
        setLoading(false);
    }
  }, [recordData, error]);

  const handleGovernanceAction = async (action: string, reason: string, newValue?: any) => {
      try {
          const res = await fetch(`/api/records/${id}/governance`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, reason, newValue })
          });
          const data = await res.json();
          if (res.ok) {
              mutate(); // Instant Refresh
          } else {
              alert(data.error || 'Action failed');
          }
      } catch (e) {
          alert('System error');
      }
  };

  const handleRequestVerification = async (recordId: string) => {
      if(confirm('Submit this record for verification?')) {
          // Use standard PATCH for status transition
          try {
              const res = await fetch(`/api/records/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'SUBMITTED' })
              });
              if (res.ok) {
                  mutate(); // Instant Refresh
              } else {
                  const data = await res.json();
                  alert(data.error || 'Submission failed');
              }
          } catch(e) { alert('System error'); }
      }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
        try {
            const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/records');
            } else {
                alert('Failed to delete');
            }
        } catch(e) { alert('Error deleting'); }
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('changeNote', changeNote);

    try {
        const res = await fetch(`/api/records/${id}/versions`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            setOpenUpload(false);
            setUploadFile(null);
            setChangeNote('');
            mutate(); // Instant Refresh
        } else {
            alert('Upload failed');
        }
    } catch (e) {
        alert('Error uploading');
    } finally {
        setUploading(false);
    }
  };

  const handleSubmitRequest = async () => {
      setSubmittingRequest(true);
      try {
          // Assuming an API endpoint for access requests
         // Note: The previous code had it embedded or separate.
         // Step 59 mentioned "Refactor Unified Access Governance" ... "create new API"
         // I will assume there is an endpoint closer to what was discussed.
         // Or just use the generic request logic if it exists.
         // For now, I'll alert as placeholder or use a generic endpoint if I know it.
         
         const res = await fetch(`/api/records/${id}/access-request`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 reason: requestReason,
                 requestedLevel: requestLevel
             })
         });
         
         if(res.ok) {
             alert('Request submitted');
             setOpenRequestDialog(false);
             mutate(); // Refresh to show pending status
         } else {
             alert('Failed to submit request');
         }
      } catch(e) {
          alert("Error submitting request");
      } finally {
          setSubmittingRequest(false);
      }
  };
  
  const handleGrantAccess = async () => {
      // Implement API call to grant access
      // POST /api/records/:id/access
      try {
          const res = await fetch(`/api/records/${id}/access`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(accessForm)
          });
          if(res.ok) {
              setOpenAccessDialog(false);
              mutate();
          } else {
              alert('Failed to grant access');
          }
      } catch(e) { alert('Error'); }
  };

  const handleRevokeAccess = async (accessId: string) => {
      if(!confirm('Revoke this permission?')) return;
      // DELETE /api/records/:id/access?accessId=...
      // Or DELETE /api/access/:id
      // I'll assume a route exists.
      try {
            const res = await fetch(`/api/records/${id}/access?accessId=${accessId}`, {
                method: 'DELETE'
            });
            if(res.ok) mutate();
            else alert('Failed to revoke');
      } catch(e) { alert('Error'); }
  };

  const handleRestore = async (versionId: string) => {
      if(!confirm('Restore this version? current content will be replaced.')) return;
      // Logic to restore version
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  // Access Denied View
  if (accessDenied) {
      return (
           <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
               <SecurityIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }} />
               <Typography variant="h4" fontWeight="bold">Access Restricted</Typography>
               <Typography color="text.secondary" maxWidth={600} textAlign="center">
                   You do not have permission to view the full details or content of this record used in <strong>{limitedInfo?.recordType?.name || 'System'}</strong>.
               </Typography>
               
               {limitedInfo && (
                  <Paper sx={{ p: 3, width: '100%', maxWidth: 600, border: '1px solid #e2e8f0' }}>
                      <Box sx={{ display: 'grid', gap: 2 }}>
                          <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight="bold">REFERENCE NUMBER</Typography>
                              <Typography variant="body1">{limitedInfo.referenceNumber || 'N/A'}</Typography>
                          </Box>
                          <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight="bold">TITLE</Typography>
                              <Typography variant="body1" fontWeight="bold">{limitedInfo.title}</Typography>
                          </Box>
                      </Box>
                  </Paper>
               )}

               {/* Request status info */}
               {existingRequest?.status === 'PENDING' && (
                   <Paper sx={{ p: 2, width: '100%', maxWidth: 600, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                       <Typography variant="body2" color="warning.dark">
                           Your access request is pending review (submitted {new Date(existingRequest.createdAt).toLocaleDateString()}).
                       </Typography>
                   </Paper>
               )}
               {existingRequest?.status === 'REJECTED' && (
                   <Paper sx={{ p: 2, width: '100%', maxWidth: 600, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                       <Typography variant="body2" color="error.dark">
                           Request rejected: {existingRequest.rejectionReason || 'No reason provided'}
                       </Typography>
                   </Paper>
               )}

               <Box sx={{ display: 'flex', gap: 2 }}>
                   <Button variant="outlined" onClick={() => router.back()}>Go Back</Button>
                   {/* Only show Request Access for OFFICIAL/OFFICIAL_CONFIDENTIAL records.
                       RESTRICTED/SECRET records require proactive grant by Records Officer. */}
                   {(!limitedInfo?.classification || ['OFFICIAL', 'OFFICIAL_CONFIDENTIAL'].includes(limitedInfo.classification)) ? (
                       <Button
                            variant={existingRequest ? "outlined" : "contained"}
                            color={existingRequest ? "warning" : "primary"}
                            startIcon={<LockPersonIcon />}
                            onClick={() => setOpenRequestDialog(true)}
                            disabled={!!existingRequest}
                       >
                           {existingRequest ? `Request ${existingRequest.status}` : "Request Access"}
                       </Button>
                   ) : (
                       <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                           Contact a Records Officer for access to this document.
                       </Typography>
                   )}
               </Box>

               <Dialog open={openRequestDialog} onClose={() => setOpenRequestDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Request Access</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField 
                                label="Reason" 
                                multiline 
                                rows={3} 
                                fullWidth 
                                value={requestReason} 
                                onChange={(e) => setRequestReason(e.target.value)} 
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenRequestDialog(false)}>Cancel</Button>
                        <Button variant="contained" onClick={handleSubmitRequest} disabled={!requestReason}>Submit</Button>
                    </DialogActions>
               </Dialog>
           </Box>
      );
  }

  if (!record) return <Box sx={{ p: 4, textAlign: 'center' }}>Record not found.</Box>;

  // Helper
  const getStatusColor = (s: string) => {
      switch(s) {
          case 'REGISTERED': return 'success';
          case 'LOCKED': return 'error';
          case 'SUBMITTED': return 'info';
          case 'ARCHIVED': return 'warning';
          default: return 'default';
      }
  };

  const currentVersion = record.versions?.[0];
  const downloadUrl = currentVersion
    ? `/api/records/${id}/download${currentVersion.id ? `?versionId=${currentVersion.id}` : ''}`
    : '#';
  const previewUrl = currentVersion
    ? `/api/records/${id}/preview${currentVersion.id ? `?versionId=${currentVersion.id}` : ''}`
    : null;
  const permissions = record.permissions || { explicit: [], inherited: [] }; // Assume API returns this structure

  // Check if file type is previewable
  const previewableTypes = [
    'application/pdf',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const isPreviewable = currentVersion?.fileType && previewableTypes.includes(currentVersion.fileType);
  const isImage = currentVersion?.fileType?.startsWith('image/');
  
  // Simple check for role/permission
  const userRole = (session?.user as any)?.role || 'USER';
  const isAdmin = userRole === 'ADMIN';
  const isRecordsOfficer = userRole === 'RECORDS_OFFICER';
  const isApprover = userRole === 'APPROVER';
  // Check if user has explicit 'FULL' or 'GOVERNANCE' access or is admin
  // This logic is ideally from API 'capabilities' response, but we approximate here:
  const canManageAccess = isAdmin || permissions.explicit?.some((p: any) => p.userId === (session?.user as any).id && p.level === 'FULL');

  return (
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        {/* 1. Header Zone (Immutable Identity) */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                        label={record.status} 
                        color={getStatusColor(record.status) as any} 
                        variant="filled"
                        sx={{ fontWeight: 'bold' }} 
                    />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            {record.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                            ID: {record.id} • REF: {record.referenceNumber || 'N/A'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" display="block" color="text.secondary">OWNER</Typography>
                    <Typography variant="body2" fontWeight="medium">{record.user?.name || 'Unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Reg: {new Date(record.createdAt).toLocaleDateString()}
                    </Typography>
                </Box>
            </Box>
        </Paper>

        <Grid container spacing={3}>
            {/* 2. Left Panel (Governance & Control) */}
            <Grid size={{ xs: 12, md: 3 }}>
                <Stack spacing={3}>
                    {/* Governance Controls */}
                    <Card variant="outlined">
                        <CardHeader 
                            title="Governance" 
                            titleTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }}
                            avatar={<GavelIcon color="action" />}
                        />
                        <CardContent sx={{ pt: 0 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {record.status === 'LOCKED' ? (
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        startIcon={<LockOpenIcon />}
                                        onClick={() => {
                                            const reason = prompt('Reason for UNLOCKING this record?');
                                            if (reason) handleGovernanceAction('UNLOCK', reason);
                                        }}
                                        disabled={!isRecordsOfficer && !isAdmin} 
                                    >
                                        Unlock Record
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        startIcon={<LockIcon />}
                                        onClick={() => {
                                            const reason = prompt('Reason for LOCKING this record? (Freezes all edits)');
                                            if (reason) handleGovernanceAction('LOCK', reason);
                                        }}
                                        disabled={record.status !== 'REGISTERED' || (!isRecordsOfficer && !isAdmin)}
                                    >
                                        Lock Record
                                    </Button>
                                )}
                                
                                {record.status === 'DRAFT' && isAdmin && (
                                     <Button
                                        variant="contained"
                                        color="success"
                                        onClick={() => handleGovernanceAction('REGISTER', 'Admin direct registration')}
                                     >
                                         Register Record
                                     </Button>
                                )}
                                {record.status === 'DRAFT' && !isAdmin && (
                                     <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => handleRequestVerification(record.id)}
                                     >
                                         Submit for Registration
                                     </Button>
                                )}

                                {record.status === 'SUBMITTED' && (isAdmin || isRecordsOfficer || isApprover) && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                         onClick={() => {
                                              handleGovernanceAction('REGISTER', 'Registration Approval');
                                         }}
                                    >
                                        Register Record
                                    </Button>
                                )}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Access Summary */}
                    <Card variant="outlined">
                        <CardHeader title="Access" titleTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }} />
                        <CardContent sx={{ pt: 0 }}>
                             <Button 
                                 size="small" 
                                 variant="outlined" 
                                 fullWidth 
                                 startIcon={<SecurityIcon />}
                                 onClick={() => setOpenAccessDialog(true)}
                                 disabled={!canManageAccess}
                             >
                                 Manage Permissions
                             </Button>
                             {permissions.explicit?.length > 0 && (
                                 <Box sx={{ mt: 2 }}>
                                     <Typography variant="caption" color="text.secondary">EXPLICIT GRANTS</Typography>
                                     <Stack spacing={1} sx={{ mt: 1 }}>
                                         {permissions.explicit.map((p: any) => (
                                             <Chip 
                                                 key={p.id} 
                                                 label={`${p.principalType === 'USER' ? p.user?.name : p.group?.name} (${p.level})`} 
                                                 size="small" 
                                                 variant="outlined"
                                                 onDelete={canManageAccess ? () => handleRevokeAccess(p.id) : undefined}
                                             />
                                         ))}
                                     </Stack>
                                 </Box>
                             )}
                        </CardContent>
                    </Card>
                    
                    {/* General Actions */}
                     <Card variant="outlined">
                        <CardHeader title="Actions" titleTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }} />
                        <CardContent sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                             <Button 
                                variant="outlined" 
                                startIcon={<CloudUploadIcon />}
                                onClick={() => setOpenUpload(true)}
                                disabled={record.status === 'LOCKED' || record.status === 'ARCHIVED'}
                             >
                                New Version
                             </Button>
                              <Button 
                                variant="outlined" 
                                color="error" 
                                startIcon={<DeleteIcon />}
                                onClick={handleDelete}
                             >
                                Delete Record
                             </Button>
                        </CardContent>
                     </Card>
                </Stack>
            </Grid>

            {/* 3. Center Main (Viewer & Tabs) */}
            <Grid size={{ xs: 12, md: 9 }}>
                 <Paper sx={{ mb: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      {/* Document Preview Header */}
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <VisibilityIcon fontSize="small" color="action" />
                              <Typography variant="subtitle2" fontWeight="bold">Document Preview</Typography>
                              {currentVersion && (
                                  <Chip
                                      label={`v${currentVersion.versionNumber}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ ml: 1 }}
                                  />
                              )}
                          </Box>
                          {record.canDownload && downloadUrl && (
                              <Button
                                  size="small"
                                  startIcon={<DownloadIcon />}
                                  component="a"
                                  href={downloadUrl}
                                  download
                              >
                                  Download
                              </Button>
                          )}
                      </Box>

                      {/* Preview Content */}
                      <Box sx={{ height: '500px', bgcolor: '#f1f5f9' }}>
                          {!record.canDownload ? (
                              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                                  <LockIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                                  <Typography color="text.secondary">
                                      You do not have permission to preview this file.
                                  </Typography>
                              </Box>
                          ) : !currentVersion?.filePath ? (
                              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Typography color="text.secondary">No file available</Typography>
                              </Box>
                          ) : !isPreviewable ? (
                              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                                  <Typography color="text.secondary">
                                      Preview not available for this file type ({currentVersion?.fileType || 'unknown'})
                                  </Typography>
                                  <Button
                                      variant="outlined"
                                      startIcon={<DownloadIcon />}
                                      component="a"
                                      href={downloadUrl}
                                      download
                                  >
                                      Download to View
                                  </Button>
                              </Box>
                          ) : isImage ? (
                              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                                  <img
                                      src={previewUrl || ''}
                                      alt={record.title}
                                      style={{
                                          maxWidth: '100%',
                                          maxHeight: '100%',
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                      }}
                                  />
                              </Box>
                          ) : (
                              <iframe
                                  src={previewUrl || ''}
                                  style={{
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                  }}
                                  title={`Preview of ${record.title}`}
                              />
                          )}
                      </Box>

                      {/* Version info footer */}
                      {currentVersion && record.versions?.length > 1 && (
                          <Box sx={{ p: 1, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                              <Typography variant="caption" color="text.secondary">
                                  Showing version {currentVersion.versionNumber} of {record.versions.length} — See Versions tab for history
                              </Typography>
                          </Box>
                      )}
                 </Paper>

                 <Paper sx={{ width: '100%' }}>
                    <Tabs value={tabIndex} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label="Metadata" />
                        <Tab label="Activity & Audit" />
                        <Tab label={`Versions (${record.versions?.length || 0})`} />
                    </Tabs>
                    
                    {/* Metadata Tab */}
                    {tabIndex === 0 && (
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                 <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">DESCRIPTION</Typography>
                                    <Typography>{record.description || '-'}</Typography>
                                 </Box>
                                 <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">DEPARTMENT</Typography>
                                    <Typography>{record.department?.name || '-'}</Typography>
                                 </Box>
                                  {record.recordType?.metadataFields?.map((def: any) => {
                                      const fieldId = def.metadataField.id;
                                      const fieldName = def.metadataField.name;
                                      const label = def.metadataField.label;
                                      // Lookup by Name (Governance Standard)
                                      const value = record.metadata?.[fieldName];
                                      
                                      if (value === undefined || value === null || value === '') return null;

                                      return (
                                        <Box key={fieldId}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                {label.toUpperCase()}
                                            </Typography>
                                            <Typography>{String(value)}</Typography>
                                        </Box>
                                      );
                                  })}
                            </Box>
                        </Box>
                    )}


                    {/* Activity & Audit Tab */}
                    {tabIndex === 1 && (
                        <Box sx={{ p: 3 }}>
                            {record.auditLogs?.length > 0 ? (
                                <Stack spacing={2}>
                                    {record.auditLogs.map((log: any) => (
                                        <Paper key={log.id} variant="outlined" sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip 
                                                        label={log.action} 
                                                        size="small" 
                                                        color="primary" 
                                                        variant="outlined"
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {log.user?.name || log.user?.email || 'System'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </Typography>
                                            </Box>
                                            
                                            {log.details && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {log.details}
                                                </Typography>
                                            )}
                                            
                                            {/* Show diff if available */}
                                            {(log.oldValue || log.newValue) && (
                                                <Box sx={{ mt: 1, bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                                                    {log.oldValue && (
                                                        <Typography variant="caption" display="block" color="error.main">
                                                            Old: {log.oldValue}
                                                        </Typography>
                                                    )}
                                                    {log.newValue && (
                                                        <Typography variant="caption" display="block" color="success.main">
                                                            New: {log.newValue}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                                    No activity recorded yet.
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Version History Tab */}
                    {tabIndex === 2 && (
                        <Box sx={{ p: 3 }}>
                            {record.versions?.length > 0 ? (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Version</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Uploaded By</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Change Note</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {record.versions.map((v: any, idx: number) => (
                                            <TableRow
                                                key={v.id}
                                                hover
                                                sx={{
                                                    bgcolor: idx === 0 ? 'action.selected' : 'inherit',
                                                    '& .MuiTableCell-root': { py: 1, verticalAlign: 'middle' }
                                                }}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip
                                                            label={`v${v.versionNumber}`}
                                                            size="small"
                                                            color={idx === 0 ? 'primary' : 'default'}
                                                            variant={idx === 0 ? 'filled' : 'outlined'}
                                                            sx={{ minWidth: 40 }}
                                                        />
                                                        {idx === 0 && (
                                                            <Chip label="Current" size="small" color="success" variant="outlined" />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{v.uploadedBy?.name || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    <Tooltip title={new Date(v.createdAt).toLocaleString()}>
                                                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color={v.changeNote ? 'text.primary' : 'text.disabled'} sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {v.changeNote || 'No note'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={v.fileType || 'unknown'} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        {record.canDownload && v.filePath && (
                                                            <Tooltip title="Download">
                                                                <IconButton
                                                                    size="small"
                                                                    component="a"
                                                                    href={`/api/records/${id}/download?versionId=${v.id}`}
                                                                    download
                                                                    color="primary"
                                                                >
                                                                    <DownloadIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {idx !== 0 && record.canDownload && (
                                                            <Tooltip title="Restore this version">
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    onClick={async () => {
                                                                        if (!confirm(`Restore version ${v.versionNumber}? This will create a new version from the old file.`)) return;
                                                                        try {
                                                                            const res = await fetch(`/api/records/${id}/restore`, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ versionId: v.id })
                                                                            });
                                                                            if (res.ok) {
                                                                                window.location.reload();
                                                                            } else {
                                                                                const data = await res.json();
                                                                                alert(data.error || 'Restore failed');
                                                                            }
                                                                        } catch {
                                                                            alert('Restore failed');
                                                                        }
                                                                    }}
                                                                >
                                                                    <RestoreIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Typography color="text.secondary">No versions found.</Typography>
                            )}
                        </Box>
                    )}
                 </Paper>
            </Grid>
        </Grid>

        {/* Upload Version Dialog */}
        <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        fullWidth
                        sx={{ height: 100, borderStyle: 'dashed' }}
                    >
                        {uploadFile ? uploadFile.name : 'Select File'}
                        <input
                            type="file"
                            hidden
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                    </Button>
                    
                    <TextField
                        label="Change Note / Comment"
                        fullWidth
                        multiline
                        rows={2}
                        value={changeNote}
                        onChange={(e) => setChangeNote(e.target.value)}
                        placeholder="Describe what changed in this version..."
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenUpload(false)}>Cancel</Button>
                <Button 
                    variant="contained" 
                    onClick={handleUploadSubmit} 
                    disabled={!uploadFile || uploading}
                >
                    {uploading ? 'Uploading...' : 'Upload Version'}
                </Button>
            </DialogActions>
        </Dialog>

         {/* Grant Access Dialog */}
         <Dialog open={openAccessDialog} onClose={() => setOpenAccessDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Grant Access</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <FormControl fullWidth>
                         <InputLabel>Principal Type</InputLabel>
                         <Select
                            value={accessForm.principalType}
                            label="Principal Type"
                            onChange={(e) => setAccessForm({...accessForm, principalType: e.target.value, principalId: ''})}
                         >
                            <MenuItem value="USER">User (Individual)</MenuItem>
                            <MenuItem value="GROUP">Group (Project/Dept)</MenuItem>
                         </Select>
                    </FormControl>

                     <UserSearch 
                        type={accessForm.principalType as 'USER' | 'GROUP'}
                        value={null}
                        onChange={(newValue: any) => {
                            if (newValue) {
                                setAccessForm({ ...accessForm, principalId: newValue.id });
                            }
                        }}
                    />

                    <FormControl fullWidth>
                        <InputLabel>Access Level</InputLabel>
                        <Select
                            value={accessForm.level}
                            label="Access Level"
                            onChange={(e) => setAccessForm({...accessForm, level: e.target.value})}
                        >
                            <MenuItem value="VIEW">View — Can read and download</MenuItem>
                            <MenuItem value="FULL">Full — Can read, edit, and upload versions</MenuItem>
                        </Select>
                    </FormControl>

                    {isAdmin && (
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Access Type</FormLabel>
                            <RadioGroup
                                row
                                value={accessForm.accessType}
                                onChange={(e) => setAccessForm({...accessForm, accessType: e.target.value})}
                            >
                                <FormControlLabel value="ALLOW" control={<Radio color="success" />} label="Allow" />
                                <FormControlLabel value="DENY" control={<Radio color="error" />} label="Deny (Block access)" />
                            </RadioGroup>
                        </FormControl>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenAccessDialog(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleGrantAccess}>Grant Access</Button>
            </DialogActions>
        </Dialog>
      </Box>
  );
}
