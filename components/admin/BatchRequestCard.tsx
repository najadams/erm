'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';

interface AccessRequest {
  id: string;
  status: string;
  requestedLevel: string;
  approvedLevel?: string;
  rejectionReason?: string;
  record?: {
    id: string;
    title: string;
    referenceNumber?: string;
    securityClassification?: string;
  };
  reviewedBy?: { name: string };
}

interface BatchRequestCardProps {
  batchId: string;
  requests: AccessRequest[];
  requester: {
    id: string;
    name: string;
    email: string;
    department?: { name: string; code: string };
  };
  reason: string;
  requestedLevel: string;
  createdAt: string;
  stats: { pending: number; approved: number; rejected: number };
  onRefresh: () => void;
}

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

export default function BatchRequestCard({
  batchId,
  requests,
  requester,
  reason,
  requestedLevel,
  createdAt,
  stats,
  onRefresh
}: BatchRequestCardProps) {
  const [expanded, setExpanded] = useState(stats.pending > 0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject'; ids: string[] } | null>(null);
  const [approvedLevel, setApprovedLevel] = useState(requestedLevel);
  const [expiresAt, setExpiresAt] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const allPendingSelected = pendingRequests.length > 0 && pendingRequests.every(r => selectedIds.has(r.id));

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const handleBulkAction = async (action: 'APPROVE_ALL' | 'REJECT_ALL') => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/batch-access-requests/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approvedLevel: action === 'APPROVE_ALL' ? approvedLevel : undefined,
          expiresAt: action === 'APPROVE_ALL' && expiresAt ? expiresAt : undefined,
          rejectionReason: action === 'REJECT_ALL' ? rejectionReason : undefined
        })
      });

      if (res.ok) {
        setActionDialog(null);
        setSelectedIds(new Set());
        onRefresh();
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

  const handleIndividualAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approvedLevel: action === 'APPROVE' ? approvedLevel : undefined,
          expiresAt: action === 'APPROVE' && expiresAt ? expiresAt : undefined,
          rejectionReason: action === 'REJECT' ? rejectionReason : undefined
        })
      });

      if (res.ok) {
        setActionDialog(null);
        onRefresh();
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
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: stats.pending > 0 ? 'warning.50' : 'grey.50',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="action" />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">{requester.name}</Typography>
              <Typography variant="caption" color="text.secondary">{requester.email}</Typography>
            </Box>
          </Box>
          {requester.department && (
            <Chip label={requester.department.code || requester.department.name} size="small" variant="outlined" />
          )}
          {getSlaChip(createdAt)}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`${requests.length} records`} size="small" variant="outlined" />
            {stats.pending > 0 && <Chip label={`${stats.pending} pending`} size="small" color="warning" />}
            {stats.approved > 0 && <Chip label={`${stats.approved} approved`} size="small" color="success" variant="outlined" />}
            {stats.rejected > 0 && <Chip label={`${stats.rejected} rejected`} size="small" color="error" variant="outlined" />}
          </Box>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Reason */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">REASON</Typography>
            <Typography variant="body2">{reason}</Typography>
          </Box>

          {/* Bulk Actions */}
          {stats.pending > 0 && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">Bulk actions:</Typography>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => setActionDialog({ type: 'approve', ids: pendingRequests.map(r => r.id) })}
              >
                Approve All ({stats.pending})
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setActionDialog({ type: 'reject', ids: pendingRequests.map(r => r.id) })}
              >
                Reject All ({stats.pending})
              </Button>
            </Box>
          )}

          {/* Records Table */}
          <Table size="small">
            <TableHead>
              <TableRow>
                {stats.pending > 0 && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allPendingSelected}
                      indeterminate={selectedIds.size > 0 && !allPendingSelected}
                      onChange={handleSelectAllPending}
                    />
                  </TableCell>
                )}
                <TableCell>Record</TableCell>
                <TableCell>Classification</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover>
                  {stats.pending > 0 && (
                    <TableCell padding="checkbox">
                      {req.status === 'PENDING' && (
                        <Checkbox
                          size="small"
                          checked={selectedIds.has(req.id)}
                          onChange={() => handleToggleSelect(req.id)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{req.record?.referenceNumber || 'N/A'}</Typography>
                    <Typography variant="caption" color="text.secondary">{req.record?.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={req.record?.securityClassification || 'OFFICIAL'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={req.requestedLevel} size="small" color="info" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={req.status}
                      size="small"
                      color={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'warning'}
                    />
                    {req.reviewedBy && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        by {req.reviewedBy.name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {req.status === 'PENDING' && (
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          color="success"
                          onClick={() => setActionDialog({ type: 'approve', ids: [req.id] })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => setActionDialog({ type: 'reject', ids: [req.id] })}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Collapse>

      {/* Action Dialog */}
      <Dialog open={actionDialog !== null} onClose={() => setActionDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {actionDialog?.type === 'approve' ? 'Approve' : 'Reject'} {actionDialog?.ids.length === 1 ? 'Request' : `${actionDialog?.ids.length} Requests`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {actionDialog?.type === 'approve' && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Access Level to Grant</InputLabel>
                  <Select
                    value={approvedLevel}
                    label="Access Level to Grant"
                    onChange={(e) => setApprovedLevel(e.target.value)}
                  >
                    <MenuItem value="VIEW">VIEW</MenuItem>
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
                />
              </>
            )}
            {actionDialog?.type === 'reject' && (
              <TextField
                label="Rejection Reason"
                fullWidth
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionDialog?.type === 'approve' ? 'success' : 'error'}
            onClick={() => {
              if (actionDialog?.ids.length === 1) {
                handleIndividualAction(actionDialog.ids[0], actionDialog.type === 'approve' ? 'APPROVE' : 'REJECT');
              } else {
                handleBulkAction(actionDialog?.type === 'approve' ? 'APPROVE_ALL' : 'REJECT_ALL');
              }
            }}
            disabled={processing || (actionDialog?.type === 'reject' && !rejectionReason)}
          >
            {processing ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
