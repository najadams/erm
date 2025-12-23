'use client';

import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, 
  CircularProgress, Alert, Container, Divider, List, ListItem, ListItemText, Chip 
} from '@mui/material';
import { useSession } from 'next-auth/react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
import GroupIcon from '@mui/icons-material/Group';
import DescriptionIcon from '@mui/icons-material/Description';
import FactCheckIcon from '@mui/icons-material/FactCheck';

export default function SystemHealthPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats');
      if (!res.ok) {
          if (res.status === 403) throw new Error("Access Denied");
          throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  if (status === 'loading' || loading) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
              <CircularProgress />
          </Box>
      );
  }

  if (error) {
      return (
          <Container maxWidth="lg" sx={{ mt: 4 }}>
              <Alert severity="error">{error}</Alert>
          </Container>
      );
  }

  if (!stats) return null;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon color="primary" sx={{ fontSize: 40 }}/>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
                System Health
            </Typography>
            <Typography variant="body1" color="text.secondary">
                Operational metrics and system status overview.
            </Typography>
          </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                    <Typography variant="overline" sx={{ opacity: 0.8 }}>Total Records</Typography>
                    <Typography variant="h3" fontWeight="bold">
                        {stats.totalRecords}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <DescriptionIcon fontSize="small" sx={{ opacity: 0.8 }} />
                        <Typography variant="caption">System Wide</Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
        
        <Grid xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: stats.pendingVerificationCount > 5 ? 'error.main' : 'warning.main', color: 'white' }}>
                <CardContent>
                    <Typography variant="overline" sx={{ opacity: 0.8 }}>Pending Verification</Typography>
                    <Typography variant="h3" fontWeight="bold">
                        {stats.pendingVerificationCount}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <FactCheckIcon fontSize="small" sx={{ opacity: 0.8 }} />
                        <Typography variant="caption">Backlog Size</Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
            <Card>
                <CardContent>
                    <Typography variant="overline" color="text.secondary">Active Users (24h)</Typography>
                    <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {stats.activeUsersCount}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: 'text.secondary' }}>
                        <GroupIcon fontSize="small" />
                        <Typography variant="caption">Unique Actors</Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
            <Card>
                <CardContent>
                    <Typography variant="overline" color="text.secondary">Total Activity (24h)</Typography>
                    <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {stats.recentActivityCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Audit Events Logged</Typography>
                </CardContent>
            </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
          {/* Status Distribution */}
          <Grid xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                      Record Status Distribution
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.entries(stats.countsByStatus).map(([status, count]: [string, any]) => (
                        <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip 
                                label={status} 
                                color={status === 'ACTIVE' ? 'success' : status === 'SUBMITTED' ? 'warning' : 'default'} 
                                size="small"
                                sx={{ minWidth: 100 }}
                            />
                            <Typography fontWeight="bold">{count}</Typography>
                        </Box>
                    ))}
                    {Object.keys(stats.countsByStatus).length === 0 && (
                        <Typography color="text.secondary">No records found.</Typography>
                    )}
                  </Box>
              </Paper>
          </Grid>

          {/* Recent Alerts / Security Events */}
          <Grid xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningIcon color="error" />
                    <Typography variant="h6" fontWeight="bold">
                        Security & Alerts (Recent)
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  
                  <List dense>
                      {stats.recentAlerts.map((log: any) => (
                          <ListItem key={log.id} sx={{ borderBottom: '1px solid #f1f5f9' }}>
                              <ListItemText 
                                  primary={
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <Typography variant="subtitle2" color="error">{log.action}</Typography>
                                          <Typography variant="caption" color="text.secondary">
                                              {new Date(log.timestamp).toLocaleTimeString()}
                                          </Typography>
                                      </Box>
                                  }
                                  secondary={
                                      <>
                                        <Typography variant="caption" component="span" display="block">
                                            User: {log.user?.name || log.userId}
                                        </Typography>
                                      </>
                                  }
                              />
                          </ListItem>
                      ))}
                      {stats.recentAlerts.length === 0 && (
                          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                              No recent alerts.
                          </Typography>
                      )}
                  </List>
              </Paper>
          </Grid>
      </Grid>
    </Container>
  );
}
