'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export default function AccessRequestDashboard() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Action Dialog
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [actionType, setActionType] = React.useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNote, setReviewNote] = React.useState('');
  const [approvedLevel, setApprovedLevel] = React.useState('READ');
  const [processing, setProcessing] = React.useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/admin/access-requests');
        if (res.ok) {
            const data = await res.json();
            setRequests(data);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
  }, []);

  const handleActionClick = (request: any, type: 'APPROVE' | 'REJECT') => {
      setSelectedRequest(request);
      setActionType(type);
      setReviewNote('');
      setApprovedLevel(request.requestedLevel);
      setOpenDialog(true);
  };

  const submitAction = async () => {
      if (!selectedRequest || !actionType) return;
      
      setProcessing(true);
      try {
          const payload = {
              action: actionType,
              approvedLevel: actionType === 'APPROVE' ? approvedLevel : undefined,
              rejectionReason: actionType === 'REJECT' ? reviewNote : undefined
          };

          const res = await fetch(`/api/admin/access-requests/${selectedRequest.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              setOpenDialog(false);
              fetchRequests(); // Refresh list
          } else {
              const err = await res.json();
              alert(err.error || 'Action failed');
          }
      } catch (e) {
          alert('Error processing request');
      } finally {
          setProcessing(false);
      }
  };

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
            Pending Access Requests
        </Typography>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            {loading ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>
            ) : requests.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>No pending requests.</Box>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Requester</TableCell>
                            <TableCell>Record</TableCell>
                            <TableCell>Requested Level</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{req.requester?.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{req.requester?.email}</Typography>
                                    {req.requester?.department && (
                                        <Box><Chip label={req.requester.department.code} size="small" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} /></Box>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{req.record?.referenceNumber || 'No Ref'}</Typography>
                                    <Typography variant="caption" color="text.secondary">{req.record?.title}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={req.requestedLevel} color="info" size="small" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 300 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{req.reason}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button 
                                            size="small" 
                                            variant="contained" 
                                            color="success"
                                            startIcon={<CheckCircleIcon />}
                                            onClick={() => handleActionClick(req, 'APPROVE')}
                                        >
                                            Approve
                                        </Button>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            color="error"
                                            startIcon={<CancelIcon />}
                                            onClick={() => handleActionClick(req, 'REJECT')}
                                        >
                                            Reject
                                        </Button>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>

        {/* Action Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
            <DialogTitle>
                {actionType === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedRequest && (
                        <Typography variant="body2" color="text.secondary">
                            {selectedRequest.requester?.name} requesting access to <strong>{selectedRequest.record?.referenceNumber}</strong>
                        </Typography>
                    )}

                    {actionType === 'APPROVE' && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Access Level to Grant</InputLabel>
                            <Select
                                value={approvedLevel}
                                label="Access Level to Grant"
                                onChange={(e) => setApprovedLevel(e.target.value)}
                            >
                                <MenuItem value="VIEW">VIEW (Metadata Only)</MenuItem>
                                <MenuItem value="READ">READ (Download)</MenuItem>
                                <MenuItem value="EDIT">EDIT</MenuItem>
                                <MenuItem value="FULL">FULL</MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    {actionType === 'REJECT' && (
                        <TextField
                            label="Rejection Reason"
                            fullWidth
                            multiline
                            rows={3}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Explain why the request is being rejected..."
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button 
                    variant="contained" 
                    color={actionType === 'APPROVE' ? 'success' : 'error'}
                    onClick={submitAction}
                    disabled={processing || (actionType === 'REJECT' && !reviewNote)}
                >
                    {processing ? 'Processing...' : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
}
