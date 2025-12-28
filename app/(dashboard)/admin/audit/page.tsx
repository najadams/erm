'use client';

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  record: {
    id: string;
    title: string;
  } | null;
  newValue?: string;
}

export default function AdminAuditPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'AUDITOR';

  useEffect(() => {
    if (isAdmin) {
        fetch('/api/audit-logs?limit=100') // Fetch more for admin view
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        })
        .then(data => {
            setLogs(data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setError(err.message);
            setLoading(false);
        });
    } else {
        setLoading(false); // Stop loading if not admin (handled by UI render)
    }
  }, [isAdmin]);

  if (!isAdmin) {
      return (
          <Box sx={{ p: 3 }}>
              <Alert severity="error">
                  Access Denied: You do not have permission to view System Audit Logs.
              </Alert>
          </Box>
      );
  }

  if (loading) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
          </Box>
      );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        System Audit Logs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Complete verifiable record of all system events.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }} aria-label="audit logs table">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actor</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Target Record</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell>
                    <Box>
                        <Typography variant="body2" fontWeight="500">
                            {log.user.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {log.user.email}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Chip 
                        label={log.action} 
                        size="small" 
                        color={log.action === 'UPLOAD' ? 'success' : 'default'} 
                        variant="outlined"
                    />
                </TableCell>
                <TableCell>
                    {log.record ? log.record.title : '-'}
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="caption" sx={{ 
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        color: 'text.secondary',
                        fontFamily: 'monospace'
                    }}>
                        {log.newValue || '-'}
                    </Typography>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        No audit logs found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
