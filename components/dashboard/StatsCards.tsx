'use client';

import React from 'react';
import useSWR from 'swr';
import Grid from '@mui/material/GridLegacy';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import { SvgIconProps } from '@mui/material/SvgIcon';

interface StatsData {
  documents: {
    total: number;
    mine: number;
    thisMonth: number;
    pending: number;
  };
  admin?: {
    users: number;
    groups: number;
  };
  audit?: {
    recentLogs: number;
  };
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactElement<SvgIconProps>, color: string }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: `${color}.lighter`, color: `${color}.main`, mr: 2, display: 'flex' }}>
             {icon}
          </Box>
          <Typography color="text.secondary" variant="body2" fontWeight="medium">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function StatsCards() {

  const fetcher = (url: string) => fetch(url).then(res => res.json());

  const { data: stats } = useSWR<StatsData>('/api/stats', fetcher, {
    refreshInterval: 5000
  });

  if (!stats) return null; // or loading skeleton

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Document Stats */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            title="Total Documents" 
            value={stats.documents.total} 
            icon={<DescriptionIcon />} 
            color="primary" 
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            title="My Documents" 
            value={stats.documents.mine} 
            icon={<FolderSharedIcon />} 
            color="info" 
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            title="Added This Month" 
            value={stats.documents.thisMonth} 
            icon={<DescriptionIcon />} 
            color="success" 
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            title="Pending Cleanup" 
            value={stats.documents.pending} 
            icon={<PendingActionsIcon />} 
            color="warning" 
        />
      </Grid>

      {/* Admin Stats */}
      {stats.admin && (
        <>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard 
                    title="Total Users" 
                    value={stats.admin.users} 
                    icon={<GroupIcon />} 
                    color="secondary" 
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard 
                    title="Active Groups" 
                    value={stats.admin.groups} 
                    icon={<GroupIcon />} 
                    color="secondary" 
                />
            </Grid>
        </>
      )}

      {/* Audit Stats */}
      {stats.audit && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
                title="Audit Alerts (Mo.)" 
                value={stats.audit.recentLogs} 
                icon={<SecurityIcon />} 
                color="error" 
            />
        </Grid>
      )}
    </Grid>
  );
}
