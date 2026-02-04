'use client';

import React from 'react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import { formatDistanceToNow } from 'date-fns';

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
}

const getActionIcon = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('upload') || lowerAction.includes('create')) {
    return <CloudUploadIcon fontSize="small" />;
  }
  if (lowerAction.includes('view') || lowerAction.includes('access')) {
    return <VisibilityIcon fontSize="small" />;
  }
  if (lowerAction.includes('update') || lowerAction.includes('edit')) {
    return <EditIcon fontSize="small" />;
  }
  if (lowerAction.includes('delete')) {
    return <DeleteIcon fontSize="small" />;
  }
  return <WarningIcon fontSize="small" />;
};

const getActionColor = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('upload') || lowerAction.includes('create')) {
    return 'success.main';
  }
  if (lowerAction.includes('view') || lowerAction.includes('access')) {
    return 'info.main';
  }
  if (lowerAction.includes('update') || lowerAction.includes('edit')) {
    return 'warning.main';
  }
  if (lowerAction.includes('delete')) {
    return 'error.main';
  }
  return 'text.secondary';
};

const formatActionMessage = (log: AuditLog) => {
  const userName = log.user.name || log.user.email;
  const recordTitle = log.record?.title || 'a document';
  
  const action = log.action.toLowerCase();
  
  if (action.includes('upload') || action.includes('create')) {
    return `${userName} uploaded ${recordTitle}`;
  }
  if (action.includes('view') || action.includes('access')) {
    return `${userName} viewed ${recordTitle}`;
  }
  if (action.includes('update') || action.includes('edit')) {
    return `${userName} updated ${recordTitle}`;
  }
  if (action.includes('delete')) {
    return `${userName} deleted ${recordTitle}`;
  }
  if (action.includes('retention')) {
    return `Retention period reached for ${recordTitle}`;
  }
  
  return `${userName} performed ${log.action} on ${recordTitle}`;
};

export default function ActivityFeed() {

  const fetcher = (url: string) => fetch(url).then(res => res.json());

  const { data: logsData, error } = useSWR<AuditLog[]>('/api/audit-logs?scope=user&limit=10', fetcher, {
    refreshInterval: 5000
  });

  const logs = Array.isArray(logsData) ? logsData : [];
  const loading = !logsData && !error;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        My Recent Activity
      </Typography>
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Loading activity...
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            No recent activity found.
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {logs.map((log, index) => (
              <ListItem
                key={log.id}
                sx={{
                  borderBottom: index < logs.length - 1 ? '1px solid #f1f5f9' : 'none',
                  '&:hover': { bgcolor: '#f8fafc' },
                  py: 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: `${getActionColor(log.action)}`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.9,
                    }}
                  >
                    {getActionIcon(log.action)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="500" color="text.primary">
                      {formatActionMessage(log)}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
