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
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { debounce } from 'lodash';

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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'AUDITOR';

  const fetchLogs = async (search: string, action: string, start: string, end: string) => {
    setLoading(true);
    try {
        const params = new URLSearchParams();
        params.append('limit', '100');
        if (search) params.append('search', search);
        if (action && action !== 'ALL') params.append('action', action);
        if (start) params.append('startDate', start);
        if (end) params.append('endDate', end);

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        setLogs(data);
    } catch (err: any) {
        console.error(err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  // Debounce search to avoid too many requests
  const debouncedFetch = React.useCallback(
    debounce((s, a, sd, ed) => fetchLogs(s, a, sd, ed), 500),
    []
  );

  useEffect(() => {
    if (isAdmin) {
        debouncedFetch(searchTerm, actionFilter, startDate, endDate);
    } else {
        setLoading(false);
    }
  }, [isAdmin, searchTerm, actionFilter, startDate, endDate, debouncedFetch]);

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

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField 
                label="Search" 
                placeholder="User, Email, Record..." 
                size="small" 
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Action</InputLabel>
                <Select
                    value={actionFilter}
                    label="Action"
                    onChange={(e) => setActionFilter(e.target.value)}
                >
                    <MenuItem value=""><em>All</em></MenuItem>
                    <MenuItem value="LOGIN">Login</MenuItem>
                    <MenuItem value="UPLOAD">Upload</MenuItem>
                    <MenuItem value="DELETE">Delete</MenuItem>
                    <MenuItem value="STATUS_CHANGE">Status Change</MenuItem>
                    <MenuItem value="LEGAL_HOLD_CREATED">Legal Hold Created</MenuItem>
                    <MenuItem value="LEGAL_HOLD_UPDATED">Legal Hold Updated</MenuItem>
                    <MenuItem value="LEGAL_HOLD_APPLIED">Legal Hold Applied</MenuItem>
                    <MenuItem value="RETENTION_POLICY_CREATED">Retention Policy Created</MenuItem>
                    <MenuItem value="RETENTION_POLICY_UPDATED">Retention Policy Updated</MenuItem>
                </Select>
            </FormControl>

            <TextField 
                label="Start Date" 
                type="date" 
                size="small" 
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={{ minWidth: 160 }}
            />
             <TextField 
                label="End Date" 
                type="date" 
                size="small" 
                InputLabelProps={{ shrink: true }}
                 value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={{ minWidth: 160 }}
            />
        </Stack>
      </Paper>

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
