'use client';

import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Chip, Button, IconButton, Tooltip, 
  CircularProgress, Alert, Container, Dialog, DialogTitle, 
  DialogContent, DialogActions, DialogContentText, TextField
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ROLES, hasPermission } from '@/lib/permissions';

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
      open: boolean;
      type: 'APPROVE' | 'REJECT';
      recordId: string | null;
      title: string;
      reason: string;
  }>({ open: false, type: 'APPROVE', recordId: null, title: '', reason: '' });

  const fetchQueue = async () => {
    try {
      setLoading(true);
      // Fetch only SUBMITTED records
      // Note: We reuse the main records API but might need to ensure backend allows filtering by status
      const res = await fetch(`/api/records?status=SUBMITTED`);
      if (!res.ok) throw new Error('Failed to fetch verification queue');
      const data = await res.json();
      setRecords(data?.records ?? (Array.isArray(data) ? data : []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      // Client-side role check (Security also on API)
      if (hasPermission(role, 'VERIFY_SUBMISSION')) {
          fetchQueue();
      } else {
          setError("Access Denied: You do not have permission to verify records.");
          setLoading(false);
      }
    }
  }, [status, session]);

  const handleAction = async () => {
      if (!confirmDialog.recordId) return;
      
      const { type, recordId, reason } = confirmDialog;
      const newStatus = type === 'APPROVE' ? 'REGISTERED' : 'DRAFT'; // Reject -> Draft

      setActionLoading(recordId);
      setConfirmDialog({ ...confirmDialog, open: false });

      try {
          const res = await fetch(`/api/records/${recordId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  status: newStatus,
                  rejectionReason: type === 'REJECT' ? reason : undefined
              })
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Action failed');
          }

          // specific success message?
          // Refresh list
          setRecords(prev => prev.filter(r => r.id !== recordId));

      } catch (err: any) {
          alert(`Error: ${err.message}`);
      } finally {
          setActionLoading(null);
      }
  };

  const openDialog = (record: any, type: 'APPROVE' | 'REJECT') => {
      setConfirmDialog({
          open: true,
          type,
          recordId: record.id,
          title: record.title,
          reason: ''
      });
  };

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'SECRET': return 'error';
      case 'RESTRICTED': return 'warning';
      case 'OFFICIAL_CONFIDENTIAL': return 'info';
      default: return 'success';
    }
  };

  const columns: GridColDef[] = [
    {
        field: 'referenceNumber',
        headerName: 'Ref',
        width: 140,
        valueGetter: (params: any) => params || '—'
    },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
    {
        field: 'securityClassification',
        headerName: 'Security',
        width: 160,
        renderCell: (params: GridRenderCellParams) => (
            <Chip
                label={(params.value || 'OFFICIAL').replace('_', ' ')}
                size="small"
                color={getSecurityColor(params.value) as any}
                variant="outlined"
            />
        )
    },
    {
        field: 'classificationNode',
        headerName: 'Classification',
        width: 180,
        valueGetter: (params: any) => {
            if (!params) return '—';
            const parts = [];
            if (params.parent?.parent?.name) parts.push(params.parent.parent.name);
            if (params.parent?.name) parts.push(params.parent.name);
            parts.push(params.name);
            return parts.join(' > ');
        }
    },
    {
        field: 'user',
        headerName: 'Uploaded By',
        width: 150,
        valueGetter: (params: any) => params?.name || 'Unknown'
    },
    {
        field: 'createdAt',
        headerName: 'Submitted',
        width: 150,
        valueFormatter: (params: any) => {
            const date = new Date(params);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const record = params.row;
        const isProcessing = actionLoading === record.id;

        if (isProcessing) return <CircularProgress size={20} />;

        return (
          <Box>
            <Tooltip title="View Record Details">
                <IconButton size="small" onClick={() => router.push(`/records/${record.id}`)}>
                    <VisibilityIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Approve (Make Official)">
                <IconButton
                    size="small"
                    color="success"
                    onClick={() => openDialog(record, 'APPROVE')}
                >
                    <CheckCircleIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Reject (Return to Draft)">
                <IconButton
                    size="small"
                    color="error"
                    onClick={() => openDialog(record, 'REJECT')}
                >
                    <CancelIcon fontSize="small" />
                </IconButton>
            </Tooltip>
          </Box>
        );
      }
    }
  ];

  if (status === 'loading') return <CircularProgress />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: '#1e293b' }}>
        Pending Verification
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review submitted records. Approve them to make them Official (Active) or Reject to return to Draft.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: 600, width: '100%', p: 2 }}>
        <DataGrid
          rows={records}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } }
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          slots={{
              noRowsOverlay: () => (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="text.secondary">No pending records found.</Typography>
                  </Box>
              )
          }}
        />
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>
            {confirmDialog.type === 'APPROVE' ? 'Approve Record?' : 'Reject Record?'}
        </DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
                {confirmDialog.type === 'APPROVE' 
                    ? `Are you sure you want to verify "${confirmDialog.title}"? It will become an ACTIVE Official Record.`
                    : `Are you sure you want to reject "${confirmDialog.title}"? It will be returned to DRAFT status.`
                }
            </DialogContentText>
            {confirmDialog.type === 'REJECT' && (
                <TextField
                    autoFocus
                    margin="dense"
                    id="reason"
                    label="Rejection Reason"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={confirmDialog.reason}
                    onChange={(e) => setConfirmDialog({ ...confirmDialog, reason: e.target.value })}
                />
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
            <Button 
                onClick={handleAction} 
                variant="contained" 
                color={confirmDialog.type === 'APPROVE' ? 'success' : 'error'}
                disabled={confirmDialog.type === 'REJECT' && !confirmDialog.reason.trim()}
            >
                {confirmDialog.type === 'APPROVE' ? 'Verify & Publish' : 'Reject Submission'}
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
