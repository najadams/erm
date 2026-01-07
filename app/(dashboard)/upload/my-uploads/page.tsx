'use client';

import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Chip, Button, IconButton, Tooltip, 
  CircularProgress, Alert, Container, Dialog, DialogTitle, 
  DialogContent, DialogActions, DialogContentText 
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';

export default function MyUploadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialog State
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const fetchMyRecords = async () => {
    if (!session?.user) return;
    try {
      setLoading(true);
      // Fetch records uploaded by ME
      const res = await fetch(`/api/records?uploader=${(session.user as any).id}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMyRecords();
    }
  }, [status, session]);

  const handleSubmit = async () => {
    if (!selectedRecord) return;
    setActionLoading(selectedRecord.id);
    setOpenSubmitDialog(false);

    try {
        const res = await fetch(`/api/records/${selectedRecord.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SUBMITTED' })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Submission failed');
        }

        // Refresh
        await fetchMyRecords();

    } catch (err: any) {
        alert(`Error: ${err.message}`);
    } finally {
        setActionLoading(null);
        setSelectedRecord(null);
    }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this draft? This cannot be undone.')) return;
      setActionLoading(id);
      try {
          const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Delete failed');
          setRecords(prev => prev.filter(r => r.id !== id));
      } catch (err: any) {
          alert(err.message);
      } finally {
          setActionLoading(null);
      }
  };

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'referenceNumber', headerName: 'Reference #', width: 150 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => {
        let color: any = 'default';
        if (params.value === 'ACTIVE') color = 'success';
        if (params.value === 'SUBMITTED') color = 'warning';
        if (params.value === 'DRAFT') color = 'info';
        return <Chip label={params.value} color={color} size="small" />;
      }
    },
    { 
        field: 'createdAt', 
        headerName: 'Date Uploaded', 
        width: 180, 
        valueFormatter: (value: any) => {
          if (!value) return 'Unknown';
          // Handle both v5 (params.value) and v6 (value) just in case, though likely v6
          const dateVal = typeof value === 'object' && value?.value ? value.value : value;
          const d = new Date(dateVal);
          return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString();
        }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const record = params.row;
        const isDraft = record.status === 'DRAFT';
        const isProcessing = actionLoading === record.id;

        if (isProcessing) return <CircularProgress size={20} />;

        return (
          <Box>
            <Tooltip title="View">
                <IconButton size="small" onClick={() => router.push(`/records/${record.id}`)}>
                    <VisibilityIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {isDraft && (
                <>
                    <Tooltip title="Submit for Verification">
                        <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => {
                                setSelectedRecord(record);
                                setOpenSubmitDialog(true);
                            }}
                        >
                            <SendIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(record.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            )}
          </Box>
        );
      }
    }
  ];

  if (status === 'loading') return <CircularProgress />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: '#1e293b' }}>
        My Uploads
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your drafts and track the status of your submissions.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: 600, width: '100%', p: 2 }}>
        <DataGrid
          rows={records}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] }
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Submit Confirmation Dialog */}
      <Dialog open={openSubmitDialog} onClose={() => setOpenSubmitDialog(false)}>
        <DialogTitle>Submit for Verification?</DialogTitle>
        <DialogContent>
            <DialogContentText>
                This will lock the record and notify the Records Team for approval. 
                You will not be able to make changes while it is under review.
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenSubmitDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" autoFocus>
                Submit
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
