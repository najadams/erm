'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import type { Record } from '@/types';

// Mock data removed

const StatusChip = ({ status }: { status: Record['status'] }) => {
  const colors = {
    active: 'primary',
    archived: 'default',
    pending_review: 'warning',
    verified: 'success',
    draft: 'info',
    rejected: 'error',
  } as const;

  const labels = {
    active: 'Active',
    archived: 'Archived',
    pending_review: 'Pending',
    verified: 'Verified',
    draft: 'Draft',
    rejected: 'Rejected',
    active_draft: 'Draft' // Handle casing if needed, but usually lowercase from DB
  };

  const normalizedStatus = (status || 'active').toLowerCase();
  
  return (
    <Chip
      label={labels[normalizedStatus as keyof typeof labels] || status}
      color={colors[normalizedStatus as keyof typeof colors] || 'default'}
      variant="outlined"
      size="small"
      icon={status === 'verified' ? <CheckCircleOutlineIcon /> : undefined}
      sx={{ fontWeight: 600 }}
    />
  );
};

export default function RecentRecords() {
  const router = useRouter();

  // SWR Fetcher
  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const { data: recordsData } = useSWR('/api/records?pageSize=5', fetcher, {
    refreshInterval: 5000
  });

  const records = (recordsData?.records ?? (Array.isArray(recordsData) ? recordsData : [])).slice(0, 5);
  
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Recent Documents
      </Typography>
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3 }}>
        {/* Header Row */}
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '30%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Document Name</Box>
          <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Reference</Box>
          <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Category</Box>
          <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Date</Box>
          <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>Status</Box>
        </Box>
        
        {/* Data Rows */}
        {records.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                {records === null ? 'Loading...' : 'No records found. Upload one!'}
            </Box>
        ) : (
            records.map((record) => (
            <Box 
                key={record.id} 
                sx={{ 
                p: 2, 
                borderBottom: '1px solid #f1f5f9', 
                display: 'flex', 
                alignItems: 'center',
                '&:hover': { bgcolor: '#f8fafc', cursor: 'pointer' }, 
                transition: 'background-color 0.2s' 
                }}
                onClick={() => router.push(`/records/${record.id}`)}
            >
                <Box sx={{ width: '30%', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: record.fileType === 'pdf' ? '#ffe4e6' : '#e0f2fe',
                    color: record.fileType === 'pdf' ? '#f43f5e' : '#0ea5e9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    }}
                >
                    {record.fileType === 'pdf' ? <PictureAsPdfIcon /> : <DescriptionIcon />}
                </Box>
                <Box sx={{ overflow: "hidden" }}>
                  <Typography fontWeight="500" color="text.primary" noWrap>{record.title}</Typography>
                </Box>
                </Box>
                <Box sx={{ width: '20%' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                    {record.referenceNumber || '-'}
                  </Typography>
                </Box>
                <Box sx={{ width: '20%' }}>
                  <Chip 
                    label={record.category || (record.recordType?.name) || (record.classificationNode?.name) || 'Uncategorized'} 
                    size="small" 
                    sx={{ bgcolor: 'secondary.light', color: 'white', fontWeight: 600 }} 
                  />
                </Box>
                <Box sx={{ width: '15%', color: 'text.secondary', fontSize: '0.875rem' }}>
                {new Date(record.createdAt).toLocaleDateString()}
                </Box>
                <Box sx={{ width: '15%' }}>
                <StatusChip status={record.status} />
                </Box>
            </Box>
            ))
        )}
      </Paper>
    </Box>
  );
}
