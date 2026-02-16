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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SortIcon from '@mui/icons-material/Sort';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

import BatchRequestCard from '@/components/admin/BatchRequestCard';

function getSlaChip(createdAt: string): React.ReactNode {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours > 48) {
    return <Chip label="Overdue" color="error" size="small" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />;
  }
  if (ageHours > 24) {
    return <Chip label="Approaching SLA" color="warning" size="small" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />;
  }
  return null;
}

export default function AccessRequestDashboard() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [batches, setBatches] = React.useState<any[]>([]);
  const [individualRequests, setIndividualRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('PENDING');
  const [sortOrder, setSortOrder] = React.useState<'oldest' | 'newest'>('oldest');
  const [viewMode, setViewMode] = React.useState<'individual' | 'grouped'>('grouped');

  // Action Dialog
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [actionType, setActionType] = React.useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNote, setReviewNote] = React.useState('');
  const [approvedLevel, setApprovedLevel] = React.useState('VIEW');
  const [expiresAt, setExpiresAt] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
        const params = new URLSearchParams();
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        params.set('sortBy', sortOrder);

        if (viewMode === 'grouped') {
            params.set('groupBy', 'batch');
            const res = await fetch(`/api/admin/access-requests?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setBatches(data.batches || []);
                setIndividualRequests(data.individual || []);
                setRequests([]);
            }
        } else {
            const res = await fetch(`/api/admin/access-requests?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setRequests(Array.isArray(data) ? data : []);
                setBatches([]);
                setIndividualRequests([]);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
  }, [statusFilter, sortOrder, viewMode]);

  const handleActionClick = (request: any, type: 'APPROVE' | 'REJECT') => {
      setSelectedRequest(request);
      setActionType(type);
      setReviewNote('');
      setApprovedLevel(request.requestedLevel);
      setExpiresAt('');
      setOpenDialog(true);
  };

  const submitAction = async () => {
      if (!selectedRequest || !actionType) return;

      setProcessing(true);
      try {
          const payload: any = {
              action: actionType,
              approvedLevel: actionType === 'APPROVE' ? approvedLevel : undefined,
              rejectionReason: actionType === 'REJECT' ? reviewNote : undefined,
              expiresAt: actionType === 'APPROVE' && expiresAt ? expiresAt : undefined
          };

          const res = await fetch(`/api/admin/access-requests/${selectedRequest.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              setOpenDialog(false);
              fetchRequests();
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

  const isPending = statusFilter === 'PENDING';

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
            Access Requests
        </Typography>

        {/* Filter Tabs + Sort */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Tabs value={statusFilter} onChange={(_, v) => setStatusFilter(v)}>
                <Tab label="Pending" value="PENDING" />
                <Tab label="Approved" value="APPROVED" />
                <Tab label="Rejected" value="REJECTED" />
                <Tab label="All" value="ALL" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, v) => { if (v) setViewMode(v); }}
                    size="small"
                >
                    <ToggleButton value="grouped">
                        <ViewModuleIcon sx={{ mr: 0.5, fontSize: 16 }} /> Grouped
                    </ToggleButton>
                    <ToggleButton value="individual">
                        <ViewListIcon sx={{ mr: 0.5, fontSize: 16 }} /> Individual
                    </ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                    value={sortOrder}
                    exclusive
                    onChange={(_, v) => { if (v) setSortOrder(v); }}
                    size="small"
                >
                    <ToggleButton value="oldest">
                        <SortIcon sx={{ mr: 0.5, fontSize: 16 }} /> Oldest First
                    </ToggleButton>
                    <ToggleButton value="newest">
                        <SortIcon sx={{ mr: 0.5, fontSize: 16, transform: 'scaleY(-1)' }} /> Newest First
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        </Box>

        {/* Grouped View */}
        {viewMode === 'grouped' && (
            <Box>
                {loading ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>
                ) : batches.length === 0 && individualRequests.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} requests.</Box>
                ) : (
                    <>
                        {/* Batch Requests */}
                        {batches.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                    Batch Requests ({batches.length})
                                </Typography>
                                {batches.map((batch: any) => (
                                    <BatchRequestCard
                                        key={batch.batchId}
                                        batchId={batch.batchId}
                                        requests={batch.requests}
                                        requester={batch.requester}
                                        reason={batch.reason}
                                        requestedLevel={batch.requestedLevel}
                                        createdAt={batch.createdAt}
                                        stats={batch.stats}
                                        onRefresh={fetchRequests}
                                    />
                                ))}
                            </Box>
                        )}

                        {/* Individual Requests (no batch) */}
                        {individualRequests.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                    Individual Requests ({individualRequests.length})
                                </Typography>
                                <Paper sx={{ overflow: 'hidden' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Requester</TableCell>
                                                <TableCell>Resource</TableCell>
                                                <TableCell>Requested Level</TableCell>
                                                <TableCell>Reason</TableCell>
                                                {isPending && <TableCell align="right">Actions</TableCell>}
                                                {!isPending && <TableCell>Status</TableCell>}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {individualRequests.map((req) => (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        {new Date(req.createdAt).toLocaleDateString()}
                                                        {isPending && getSlaChip(req.createdAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="bold">{req.requester?.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{req.requester?.email}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {req.record ? (
                                                            <>
                                                                <Typography variant="body2" fontWeight="bold">{req.record.referenceNumber || 'No Ref'}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{req.record.title}</Typography>
                                                            </>
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">Unknown</Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={req.requestedLevel} color="info" size="small" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 250 }}>
                                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{req.reason}</Typography>
                                                    </TableCell>
                                                    {isPending && (
                                                        <TableCell align="right">
                                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                                <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleActionClick(req, 'APPROVE')}>Approve</Button>
                                                                <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleActionClick(req, 'REJECT')}>Reject</Button>
                                                            </Box>
                                                        </TableCell>
                                                    )}
                                                    {!isPending && (
                                                        <TableCell>
                                                            <Chip label={req.status} size="small" color={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'default'} />
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        )}

        {/* Individual View (Original Table) */}
        {viewMode === 'individual' && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            {loading ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>
            ) : requests.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} requests.</Box>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Requester</TableCell>
                            <TableCell>Resource</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Requested Level</TableCell>
                            <TableCell>Reason</TableCell>
                            {!isPending && <TableCell>Status</TableCell>}
                            {isPending && <TableCell align="right">Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>
                                    {new Date(req.createdAt).toLocaleDateString()}
                                    {isPending && getSlaChip(req.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{req.requester?.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{req.requester?.email}</Typography>
                                    {req.requester?.department && (
                                        <Box><Chip label={req.requester.department.code || req.requester.department.name} size="small" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} /></Box>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {req.record ? (
                                        <>
                                            <Typography variant="body2" fontWeight="bold">{req.record.referenceNumber || 'No Ref'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{req.record.title}</Typography>
                                        </>
                                    ) : req.registeredCompany ? (
                                        <>
                                            <Typography variant="body2" fontWeight="bold">{req.registeredCompany.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{req.registeredCompany.registrationNumber}</Typography>
                                        </>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Unknown</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={req.resourceType}
                                        size="small"
                                        variant="outlined"
                                        color={req.resourceType === 'RECORD' ? 'primary' : 'secondary'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip label={req.requestedLevel} color="info" size="small" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 250 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{req.reason}</Typography>
                                </TableCell>
                                {!isPending && (
                                    <TableCell>
                                        <Chip
                                            label={req.status}
                                            size="small"
                                            color={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'default'}
                                        />
                                        {req.reviewedBy && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                by {req.reviewedBy.name}
                                            </Typography>
                                        )}
                                    </TableCell>
                                )}
                                {isPending && (
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
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>
        )}

        {/* Action Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
            <DialogTitle>
                {actionType === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedRequest && (
                        <Typography variant="body2" color="text.secondary">
                            {selectedRequest.requester?.name} requesting access to{' '}
                            <strong>{selectedRequest.record?.referenceNumber || selectedRequest.registeredCompany?.name}</strong>
                        </Typography>
                    )}

                    {actionType === 'APPROVE' && (
                        <>
                            <FormControl fullWidth size="small">
                                <InputLabel>Access Level to Grant</InputLabel>
                                <Select
                                    value={approvedLevel}
                                    label="Access Level to Grant"
                                    onChange={(e) => setApprovedLevel(e.target.value)}
                                >
                                    <MenuItem value="VIEW">VIEW (Metadata Only)</MenuItem>
                                    <MenuItem value="COMMENT">COMMENT</MenuItem>
                                    <MenuItem value="EDIT_METADATA">EDIT METADATA</MenuItem>
                                    <MenuItem value="EDIT_CONTENT">EDIT CONTENT</MenuItem>
                                    <MenuItem value="FULL">FULL</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Access Expiry Date (optional)"
                                type="date"
                                fullWidth
                                size="small"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                helperText="Leave empty for no expiry"
                            />
                        </>
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
