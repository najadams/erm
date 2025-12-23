'use client';

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid2 from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Sidebar from '@/components/layout/Sidebar';
import StorageIcon from '@mui/icons-material/Storage';
import GroupIcon from '@mui/icons-material/Group';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

// Simple Bar Chart Component
const SimpleBarChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return <Typography>No data</Typography>;
    
    // Find max for scaling
    const maxVal = Math.max(...data.map(d => d.upload + d.login + d.other));

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 2, pt: 4, pb: 2 }}>
            {data.map((d) => {
                const total = d.upload + d.login + d.other;
                const heightPercent = maxVal > 0 ? (total / maxVal) * 100 : 0;
                return (
                    <Box key={d.date} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', bgcolor: '#f1f5f9', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                             {/* Stacked Bars */}
                             <Box sx={{ height: `${(d.other / maxVal) * 100}%`, bgcolor: 'grey.300', width: '100%' }} />
                             <Box sx={{ height: `${(d.login / maxVal) * 100}%`, bgcolor: 'info.light', width: '100%' }} />
                             <Box sx={{ height: `${(d.upload / maxVal) * 100}%`, bgcolor: 'secondary.main', width: '100%' }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                            {d.date.slice(5)}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
};

export default function SystemHealthPage() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/metrics')
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Box p={4}>Loading Metrics...</Box>;
    if (!metrics) return <Box p={4}>Failed to load metrics.</Box>;

    const { overview, recordDistribution, activityTrend } = metrics;
    
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
            <Sidebar />
            <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
                
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" className="premium-gradient-text">
                            System Analytics
                        </Typography>
                        <Typography color="text.secondary">
                            Real-time health monitoring and usage statistics.
                        </Typography>
                    </Box>
                    <Chip 
                        icon={<CheckCircleIcon />} 
                        label="System Healthy" 
                        color="success" 
                        variant="outlined"
                        sx={{ fontWeight: 'bold' }} 
                    />
                </Box>

                {/* KPI Cards */}
                <Grid2 container spacing={3} sx={{ mb: 4 }}>
                    <Grid2 size={{ xs: 12, md: 3 }}>
                        <Paper className="glass-panel" sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                <StorageIcon sx={{ mr: 1 }} />
                                <Typography variant="overline" fontWeight="bold">Total Storage</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">{formatBytes(overview.storageBytes)}</Typography>
                            <Typography variant="caption" color="text.secondary">Est. based on record count</Typography>
                        </Paper>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 3 }}>
                         <Paper className="glass-panel" sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'secondary.main' }}>
                                <DescriptionIcon sx={{ mr: 1 }} />
                                <Typography variant="overline" fontWeight="bold">Total Records</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">{overview.totalRecords}</Typography>
                        </Paper>
                    </Grid2>
                     <Grid2 size={{ xs: 12, md: 3 }}>
                         <Paper className="glass-panel" sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'info.main' }}>
                                <GroupIcon sx={{ mr: 1 }} />
                                <Typography variant="overline" fontWeight="bold">Total Users</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">{overview.totalUsers}</Typography>
                        </Paper>
                    </Grid2>
                     <Grid2 size={{ xs: 12, md: 3 }}>
                         <Paper className="glass-panel" sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'warning.main' }}>
                                <WarningIcon sx={{ mr: 1 }} />
                                <Typography variant="overline" fontWeight="bold">Pending Disposal</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">{overview.recordsPendingHeaders}</Typography>
                        </Paper>
                    </Grid2>
                </Grid2>

                {/* Charts Area */}
                <Grid2 container spacing={4}>
                    <Grid2 size={{ xs: 12, lg: 8 }}>
                        <Paper className="glass-panel" sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>Activity Trends (7 Days)</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 12, height: 12, bgcolor: 'secondary.main', borderRadius: '50%' }} />
                                    <Typography variant="caption">Uploads</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 12, height: 12, bgcolor: 'info.light', borderRadius: '50%' }} />
                                    <Typography variant="caption">Logins</Typography>
                                </Box>
                            </Box>
                            <SimpleBarChart data={activityTrend} />
                        </Paper>
                    </Grid2>

                    <Grid2 size={{ xs: 12, lg: 4 }}>
                         <Paper className="glass-panel" sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>Record Distribution</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {recordDistribution.map((item: any) => (
                                    <Box key={item.name}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{item.name.replace('_', ' ').toLowerCase()}</Typography>
                                            <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={(item.value / overview.totalRecords) * 100} 
                                            sx={{ 
                                                height: 8, 
                                                borderRadius: 4,
                                                bgcolor: 'grey.100',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: 
                                                        item.name === 'ACTIVE' ? 'primary.main' :
                                                        item.name === 'DRAFT' ? 'info.main' :
                                                        item.name === 'ARCHIVED' ? 'grey.500' :
                                                        item.name === 'DISPOSED' ? 'error.light' :
                                                        'warning.main'
                                                }
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                         </Paper>
                    </Grid2>
                </Grid2>

            </Box>
        </Box>
    );
}