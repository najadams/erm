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
import Link from 'next/link';

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function MyRequestsPage() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('ALL');

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
          <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>
        ) : requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} requests.
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
                      <Typography variant="caption" color="text.secondary">
                        Awaiting review
                      </Typography>
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
