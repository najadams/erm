'use client';

import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    CircularProgress, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions,
    IconButton,
    Paper,
    Chip,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import { useParams, useRouter } from 'next/navigation';
import RecordAutocomplete from '@/components/upload/RecordAutocomplete';
import UploadRecordModal from '@/components/dashboard/UploadRecordModal';

interface ProjectRecord {
    id: string; // This is the ProjectRecord ID (link ID)
    projectId: string;
    recordId: string;
    addedAt: string;
    addedBy: {
        name: string;
        email: string;
    };
    record: {
        id: string; // The actual record ID
        title: string;
        referenceNumber?: string;
        status: string;
        createdAt: string;
        recordType?: { name: string };
        classificationNode?: { name: string };
        versions: Array<{ fileType: string }>;
    }
}

export default function RecordsTab() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [records, setRecords] = useState<ProjectRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null); // From Autocomplete
    const [linking, setLinking] = useState(false);
    const [openUpload, setOpenUpload] = useState(false);

    useEffect(() => {
        if (id) {
            fetchRecords();
        }
    }, [id]);

    const fetchRecords = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/records`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            }
        } catch (error) {
            console.error('Failed to load records', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkRecord = async () => {
        if (!selectedRecord) return;
        setLinking(true);
        try {
            const res = await fetch(`/api/projects/${id}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId: selectedRecord.id })
            });

            if (res.ok) {
                setOpenAdd(false);
                setSelectedRecord(null);
                fetchRecords(); // Refresh list
            } else {
                const err = await res.json();
                console.error(err);
                alert(err.error || 'Failed to link record');
            }
        } catch (error) {
            console.error('Link error', error);
        } finally {
            setLinking(false);
        }
    };

    const handleUnlink = async (recordLink: ProjectRecord) => {
        if (!confirm('Are you sure you want to unlink this record from the project?')) return;

        try {
            const res = await fetch(`/api/projects/${id}/records?recordId=${recordLink.record.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchRecords();
            } else {
                alert('Failed to unlink record');
            }
        } catch (error) {
            console.error('Unlink error', error);
        }
    };

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Project Records</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                        variant="outlined" 
                        startIcon={<AddIcon />} 
                        onClick={() => setOpenAdd(true)}
                    >
                        Link Existing
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />} 
                        onClick={() => setOpenUpload(true)}
                    >
                        Upload New
                    </Button>
                </Box>
            </Box>

            {records.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary', bgcolor: '#f8fafc' }}>
                    <DescriptionIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography>No records linked to this project yet.</Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button onClick={() => setOpenAdd(true)}>Link Existing Record</Button>
                        <Button variant="contained" onClick={() => setOpenUpload(true)}>Upload New</Button>
                    </Box>
                </Paper>
            ) : (
                <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                     {/* Header */}
                     <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '40%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Document</Box>
                        <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Type</Box>
                        <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Added By</Box>
                        <Box sx={{ width: '10%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Status</Box>
                        <Box sx={{ width: '10%', textAlign: 'right', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Actions</Box>
                    </Box>

                    {records.map((item) => (
                        <Box 
                            key={item.id}
                            sx={{ 
                                p: 2, 
                                borderBottom: '1px solid #f1f5f9', 
                                display: 'flex', 
                                alignItems: 'center',
                                '&:hover': { bgcolor: '#f8fafc' }, 
                                transition: 'background-color 0.2s' 
                            }}
                        >
                            <Box sx={{ width: '40%', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => router.push(`/records/${item.record.id}`)}>
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 2,
                                        bgcolor: item.record.versions?.[0]?.fileType === 'pdf' ? '#ffe4e6' : '#e0f2fe',
                                        color: item.record.versions?.[0]?.fileType === 'pdf' ? '#f43f5e' : '#0ea5e9',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center'
                                    }}
                                >
                                    {item.record.versions?.[0]?.fileType === 'pdf' ? <PictureAsPdfIcon fontSize="small" /> : <DescriptionIcon fontSize="small" />}
                                </Box>
                                <Box>
                                    <Typography fontWeight="500" fontSize="0.95rem">{item.record.title}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {item.record.referenceNumber || 'No Ref'} • {new Date(item.record.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ width: '20%' }}>
                                <Chip 
                                    label={item.record.classificationNode?.name || item.record.recordType?.name || 'General'} 
                                    size="small" 
                                    variant="outlined"
                                />
                            </Box>

                            <Box sx={{ width: '20%' }}>
                                <Typography variant="body2">{item.addedBy?.name || 'Unknown'}</Typography>
                                <Typography variant="caption" color="text.secondary">{new Date(item.addedAt).toLocaleDateString()}</Typography>
                            </Box>

                            <Box sx={{ width: '10%' }}>
                                <Chip 
                                    label={item.record.status} 
                                    size="small" 
                                    color={item.record.status === 'verified' || item.record.status === 'ACTIVE' ? 'success' : 'default'}
                                    variant="outlined"
                                />
                            </Box>

                            <Box sx={{ width: '10%', textAlign: 'right' }}>
                                <Tooltip title="Unlink Record">
                                    <IconButton size="small" color="error" onClick={() => handleUnlink(item)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))}
                </Paper>
            )}

            {/* Link Record Modal */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Link Record to Project</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ mt: 1 }}>
                        <RecordAutocomplete 
                            value={selectedRecord}
                            onChange={(newValue) => setSelectedRecord(newValue)}
                            label="Search Records by Name or Ref"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                    <Button 
                        onClick={handleLinkRecord} 
                        variant="contained" 
                        disabled={!selectedRecord || linking}
                    >
                        {linking ? 'Linking...' : 'Link Record'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload New Record Modal */}
            <UploadRecordModal 
                open={openUpload} 
                onClose={() => setOpenUpload(false)} 
                onUploadSuccess={() => {
                    fetchRecords(); // Refresh list to show new file
                }}
                projectId={id}
            />

        </Box>
    );
}
