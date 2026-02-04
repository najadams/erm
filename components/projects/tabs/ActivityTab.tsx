'use client';

import React, { useEffect, useState } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    List, 
    ListItem, 
    ListItemAvatar, 
    Avatar, 
    ListItemText, 
    CircularProgress, 
    Divider 
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    newValue?: string;
    user: {
        name: string;
        email: string;
    };
    timestamp: string;
}

export default function ActivityTab() {
  const params = useParams();
  const id = params?.id as string;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchLogs();
  }, [id]);

  const fetchLogs = async () => {
    try {
        const res = await fetch(`/api/projects/${id}/audit-logs`);
        if (res.ok) {
            const data = await res.json();
            setLogs(data);
        }
    } catch (error) {
        console.error('Failed to load audit logs', error);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
        <Typography variant="h6" gutterBottom>Project Activity</Typography>
        
        {logs.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography>No activity recorded yet.</Typography>
            </Paper>
        ) : (
            <Paper elevation={0} variant="outlined">
                <List disablePadding>
                    {logs.map((log, index) => (
                        <React.Fragment key={log.id}>
                            <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                        {log.user.name ? log.user.name.charAt(0) : <PersonIcon />}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {log.user.name || log.user.email}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <React.Fragment>
                                             <Typography 
                                                component="span" 
                                                variant="body2" 
                                                color="text.primary"
                                                fontWeight="medium"
                                             >
                                                {log.action}
                                             </Typography>
                                             {log.newValue && (
                                                 <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, bgcolor: 'action.hover', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {log.newValue}
                                                 </Typography>
                                             )}
                                        </React.Fragment>
                                    }
                                />
                            </ListItem>
                            {index < logs.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        )}
    </Box>
  );
}
