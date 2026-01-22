'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SecurityIcon from '@mui/icons-material/Security';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UserSearch from '@/components/UserSearch';

import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function RecordDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const id = params?.id as string;
  const [record, setRecord] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Upload State
  const [openUpload, setOpenUpload] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [changeNote, setChangeNote] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  // Access Control State
  const [permissions, setPermissions] = React.useState<{ explicit: any[], inherited: any[] }>({ explicit: [], inherited: [] });
  const [openAccessDialog, setOpenAccessDialog] = React.useState(false);
  const [accessForm, setAccessForm] = React.useState({
      principalType: 'USER', // USER or GROUP
      principalId: '',
      level: 'VIEW',
      accessType: 'ALLOW'
  });

  const userRole = (session?.user as any)?.role || 'USER';
  const userId = (session?.user as any)?.id;
  // Note: We need record to calculate ownership, so we wait for record load.
  const isOwner = record?.ownerUserId === userId;
  // const isAdmin = userRole === 'ADMIN'; // Defined below inside render or effect? Better defined here once record is loaded.
   const isAdmin = userRole === 'ADMIN';
   const canManageAccess = isOwner || isAdmin;

  // Fetch Permissions ONLY if allowed
  React.useEffect(() => {
    if (id && canManageAccess) {
        fetch(`/api/records/${id}/access`)
        .then(res => {
            if (res.ok) return res.json();
             // If 403, just ignore
            return { explicit: [], inherited: [] };
        })
        .then(data => setPermissions(data))
        .catch(e => console.error(e));
    }
  }, [id, canManageAccess]);


  React.useEffect(() => {
    if (id) {
        fetch(`/api/records/${id}`)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
        })
        .then(data => setRecord(data))
        .catch(() => setRecord(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleRequestVerification = async (recordId: string) => {
      if (!confirm('Submit this record for verification? You will not be able to edit it while it is under review.')) return;
      try {
          const res = await fetch(`/api/records/${recordId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'SUBMITTED' })
          });
          
          if (!res.ok) {
               const err = await res.json();
               alert(err.error || 'Submission failed');
               return;
          }
          
          window.location.reload();
      } catch (e) {
          alert('Error submitting record');
      }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this record?')) {
        await fetch(`/api/records/${id}`, { method: 'DELETE' });
        router.push('/');
    }
  };

  const handleRestore = async (versionId: string) => {
      if (!confirm('This will create a new version with the content of the selected version. Continue?')) return;
      try {
          const res = await fetch(`/api/records/${id}/restore`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ versionId })
          });
          if (res.ok) {
              window.location.reload();
          } else {
              alert('Failed to restore');
          }
      } catch (e) {
          alert('Error restoring version');
      }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return alert('Please select a file');
    
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
            window.location.reload();
        } else {
            const data = await res.json();
            alert(data.error || 'Upload failed');
        }
    } catch (e) {
        console.error(e);
        alert('Upload failed');
    } finally {
        setUploading(false);
    }
  };

  const handleGrantAccess = async () => {
      if (!accessForm.principalId) return alert('Please select a User or Group');

      try {
          const res = await fetch(`/api/records/${id}/access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(accessForm)
          });
          
          if (res.ok) {
              window.location.reload();
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to grant access');
          }
      } catch (e) {
          alert('Error granting access');
      }
  };

  const handleRevokeAccess = async (accessId: string) => {
      if (!confirm('Revoke this permission?')) return;
      try {
          const res = await fetch(`/api/records/${id}/access?accessId=${accessId}`, {
              method: 'DELETE'
          });
          if (res.ok) {
              window.location.reload();
          } else {
              alert('Failed to revoke');
          }
      } catch (e) {
          alert('Error revoking access');
      }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>;
  if (!record) return <Box sx={{ p: 4, textAlign: 'center' }}>Record not found.</Box>;

  // Get current version file
  const currentVersion = record.versions?.[0];
  const downloadUrl = currentVersion?.filePath || '#';
  
  // Refined for display
  const showAccessControl = canManageAccess;

  return (
      <React.Fragment>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => router.back()}
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            Back to Dashboard
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight="bold">
                  {record.title}
                </Typography>
                <Chip 
                  label={record.status} 
                  color="success" 
                  variant="outlined" 
                  size="small" 
                  icon={<CheckCircleIcon />}
                  sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}
                />
              </Box>
              <Typography variant="subtitle1" color="primary.main" fontWeight="medium" sx={{ mb: 0.5 }}>
                 {record.referenceNumber || 'No Reference Number'}
              </Typography>
              <Typography color="text.secondary">
                Type: <strong>{record.recordType?.name || 'General'}</strong> • 
                Uploaded by <strong style={{ color: '#0f172a' }}>{record.user?.name || 'Unknown'}</strong> on {new Date(record.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
               <Button 
                 variant="outlined" 
                 startIcon={<CloudUploadIcon />}
                 onClick={() => setOpenUpload(true)}
               >
                 New Version
               </Button>
               <Button 
                 variant="contained" 
                 color="secondary" 
                 startIcon={<VisibilityIcon />}
                 href={downloadUrl}
                 target="_blank"
               >
                 Preview / Download
               </Button>
            </Box>
          </Box>
        </Box>

        {/* Content Layout */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4}>
          
          {/* Main Info */}
          <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Dynamic Metadata Card */}
             <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Record Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                 {/* Standard Fields */}
                 <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">DESCRIPTION</Typography>
                    <Typography>{record.description || '-'}</Typography>
                 </Box>

                  {/* Department & Project */}
                  <Box>
                     <Typography variant="caption" color="text.secondary" fontWeight="bold">DEPARTMENT</Typography>
                     <Typography>{record.department?.name || '-'}</Typography>
                  </Box>
                  <Box>
                     <Typography variant="caption" color="text.secondary" fontWeight="bold">PROJECT / CASE</Typography>
                     <Typography>{record.project?.name || '-'}</Typography> 
                  </Box>

                  {/* Retention Schedule */}
                 <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">RETENTION SCHEDULE</Typography>
                    {record.dispositionDate ? (
                        <Box>
                             <Typography variant="body2" fontWeight="bold">
                                {new Date(record.dispositionDate).toLocaleDateString()}
                             </Typography>
                             <Typography variant="caption" color={new Date(record.dispositionDate) < new Date() ? 'error' : 'text.secondary'}>
                                {new Date(record.dispositionDate) < new Date() 
                                    ? 'Expired - Actions Required' 
                                    : `Expires in ${Math.ceil((new Date(record.dispositionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365))} years`
                                }
                             </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">Indefinite</Typography>
                    )}
                 </Box>

                 {/* Parent Record Link */}
                 {record.parent && (
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">PARENT RECORD</Typography>
                        <Typography>
                            <a href={`/records/${record.parent.id}`} style={{ color: '#0ea5e9', textDecoration: 'underline' }}>
                                {record.parent.referenceNumber ? `${record.parent.referenceNumber} - ` : ''}{record.parent.title}
                            </a>
                        </Typography>
                    </Box>
                 )}

                 
                 {/* Dynamic Fields */}
                 {record.metadata?.map((meta: any) => (
                   <Box key={meta.id}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        {meta.metadataField?.label.toUpperCase()}
                      </Typography>
                      <Typography>{meta.value}</Typography>
                   </Box>
                 ))}
              </Box>
            </Paper>

            {/* Access Control - ONLY VISIBLE TO OWNER/ADMIN */}
            {showAccessControl && (
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">Access Control</Typography>
                     <Button 
                         startIcon={<SecurityIcon />} 
                         size="small" 
                         onClick={() => setOpenAccessDialog(true)}
                     >
                         Grant Access
                     </Button>
                </Box>
                
                {/* Inherited Policies */}
                {permissions.inherited.length > 0 && (
                     <Box sx={{ mb: 3 }}>
                         <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            EFFECTIVE / INHERITED ACCESS
                         </Typography>
                         <Stack spacing={1}>
                             {permissions.inherited.map((rule: any, i: number) => (
                                 <Chip 
                                     key={i} 
                                     icon={<Typography variant="caption" sx={{ pl: 1 }}>{rule.level}</Typography>}
                                     label={`${rule.source} - ${rule.description}`} 
                                     size="small"
                                     variant="outlined"
                                     sx={{ justifyContent: 'flex-start', maxWidth: '100%' }}
                                 />
                             ))}
                         </Stack>
                     </Box>
                )}

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Principal</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Access Level</TableCell>
                            <TableCell>Permission</TableCell>
                            <TableCell align="right">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Owner (Implicit) */}
                        <TableRow>
                            <TableCell>{record.user?.name || 'Owner'}</TableCell>
                            <TableCell>USER</TableCell>
                            <TableCell>FULL</TableCell>
                            <TableCell><Chip label="OWNER" size="small" color="primary" /></TableCell>
                            <TableCell align="right">-</TableCell>
                        </TableRow>
                        
                        {/* Explicit Permissions */}
                        {permissions.explicit?.map((access: any) => (
                            <TableRow key={access.id}>
                                <TableCell>
                                    {access.principalType === 'USER' ? access.user?.name || access.userId : access.group?.name || access.groupId}
                                </TableCell>
                                <TableCell>{access.principalType}</TableCell>
                                <TableCell>{access.level}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={access.accessType} 
                                        size="small" 
                                        color={access.accessType === 'ALLOW' ? 'success' : 'error'} 
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" color="error" onClick={() => handleRevokeAccess(access.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            )}

            {/* Version History */}
            <Paper sx={{ p: 3 }}>
               <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Version History</Typography>
               <Table size="small">
                 <TableHead>
                   <TableRow>
                     <TableCell>Version</TableCell>
                     <TableCell>Date</TableCell>
                     <TableCell>Uploaded By</TableCell>
                     <TableCell align="right">Action</TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                   {record.versions?.map((v: any, index: number) => (
                     <TableRow key={v.id}>
                       <TableCell>v{v.versionNumber}</TableCell>
                       <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                       <TableCell>{v.uploadedBy?.name}</TableCell>
                        <TableCell align="right">
                          <Button size="small" href={v.filePath} target="_blank">Download</Button>
                          {index > 0 && ( /* Assuming ordered desc, index 0 is current, so others can be restored */
                             <Button size="small" color="warning" onClick={() => handleRestore(v.id)}>Restore</Button>
                          )}
                        </TableCell>
                     </TableRow>
                   ))}
                   {(!record.versions || record.versions.length === 0) && (
                     <TableRow><TableCell colSpan={4} align="center">No versions found</TableCell></TableRow>
                   )}
                 </TableBody>
               </Table>
            </Paper>

          </Box>

          {/* Sidebar */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => handleRequestVerification(record.id)} 
                  fullWidth
                  disabled={record.status !== 'DRAFT'}
                >
                  Request Verification
                </Button>

                {(record.status === 'SUBMITTED' || record.status === 'DRAFT') && (
                     <Button 
                        variant="contained" 
                        color="success" 
                        onClick={() => {
                            if(confirm('Approve this record and mark as ACTIVE?')) {
                                fetch(`/api/records/${record.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'ACTIVE' })
                                }).then(res => {
                                    if(res.ok) window.location.reload();
                                    else alert('Failed to approve');
                                });
                            }
                        }} 
                        fullWidth
                    >
                        Approve Record (Admin)
                    </Button>
                )}

                <Button variant="outlined" color="error" fullWidth onClick={handleDelete}>Delete Record</Button>
              </Box>
            </Paper>
          </Box>

        </Stack>

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

                    {/* NEW: User Search Component */}
                    <UserSearch 
                        type={accessForm.principalType as 'USER' | 'GROUP'}
                        value={null} // Controlled vs Uncontrolled? The component handles search, we just need ID.
                        onChange={(newValue: any) => {
                            if (newValue) {
                                setAccessForm({ ...accessForm, principalId: newValue.id });
                            }
                        }}
                    />
                    {accessForm.principalId && (
                        <Typography variant="caption" color="success.main">
                            Selected ID: {accessForm.principalId}
                        </Typography>
                    )}

                    <FormControl fullWidth>
                         <InputLabel>Access Level</InputLabel>
                         <Select
                            value={accessForm.level}
                            label="Access Level"
                            onChange={(e) => setAccessForm({...accessForm, level: e.target.value})}
                         >
                            <MenuItem value="VIEW">VIEW (Metadata Only)</MenuItem>
                            <MenuItem value="READ">READ (Download File)</MenuItem>
                            <MenuItem value="EDIT">EDIT (Metadata & Versions)</MenuItem>
                            <MenuItem value="FULL">FULL (Manage)</MenuItem>
                         </Select>
                    </FormControl>

                    <FormControl fullWidth>
                         <InputLabel>Permission Type</InputLabel>
                         <Select
                            value={accessForm.accessType}
                            label="Permission Type"
                            onChange={(e) => setAccessForm({...accessForm, accessType: e.target.value})}
                         >
                            <MenuItem value="ALLOW">ALLOW</MenuItem>
                            <MenuItem value="DENY">DENY (Explicit Block)</MenuItem>
                         </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenAccessDialog(false)}>Cancel</Button>
                <Button 
                    variant="contained" 
                    onClick={handleGrantAccess}
                    disabled={!accessForm.principalId}
                >
                    Grant Permission
                </Button>
            </DialogActions>
        </Dialog>

      </React.Fragment>
  );
}
