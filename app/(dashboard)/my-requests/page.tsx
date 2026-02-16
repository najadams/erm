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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Link from 'next/link';
import CancelIcon from '@mui/icons-material/Cancel';

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function MyRequestsPage() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/my-requests?${params.toString()}`);
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleCancel = async (requestId: string) => {
    if (!confirm('Cancel this access request?')) return;
    setCancelling(requestId);
    try {
      const res = await fetch(`/api/my-requests?id=${requestId}`, { method: 'DELETE' });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel');
      }
    } catch {
      alert('Error cancelling request');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        My Access Requests
      </Typography>

      <Tabs value={statusFilter} onChange={(_, v) => setStatusFilter(v)} sx={{ mb: 2 }}>
        <Tab label="All" value="ALL" />
        <Tab label="Pending" value="PENDING" />
        <Tab label="Approved" value="APPROVED" />
        <Tab label="Rejected" value="REJECTED" />
      </Tabs>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Loading requests...</Typography>
          </Box>
        ) : requests.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ mb: 1 }}>
              {statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} requests` : 'No access requests yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {statusFilter === 'ALL'
                ? 'When you request access to records or companies, they will appear here.'
                : `You don't have any ${statusFilter.toLowerCase()} requests.`}
            </Typography>
            {statusFilter === 'ALL' && (
              <Button variant="outlined" onClick={() => window.location.href = '/records'}>
                Browse Records
              </Button>
            )}
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Requested Level</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reviewed By</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {req.record ? (
                      <Link href={`/records/${req.record.id}`} style={{ textDecoration: 'none' }}>
                        <Typography variant="body2" fontWeight="bold" color="primary" sx={{ cursor: 'pointer' }}>
                          {req.record.referenceNumber || req.record.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{req.record.title}</Typography>
                      </Link>
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
                    <Chip label={req.requestedLevel} size="small" variant="outlined" color="info" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={req.status}
                      size="small"
                      color={statusColor[req.status] || 'default'}
                    />
                    {req.approvedLevel && req.status === 'APPROVED' && req.approvedLevel !== req.requestedLevel && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Granted: {req.approvedLevel}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.reviewedBy ? (
                      <>
                        <Typography variant="body2">{req.reviewedBy.name}</Typography>
                        {req.reviewedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(req.reviewedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 250 }}>
                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <Typography variant="body2" color="error.main" sx={{ whiteSpace: 'pre-wrap' }}>
                        {req.rejectionReason}
                      </Typography>
                    )}
                    {req.status === 'PENDING' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleCancel(req.id)}
                        disabled={cancelling === req.id}
                      >
                        {cancelling === req.id ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                    {req.status === 'APPROVED' && req.expiresAt && (
                      <Typography variant="caption" color="text.secondary">
                        Expires: {new Date(req.expiresAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
