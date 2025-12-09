'use client';

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import type { Record } from '@/types';

// Mock data removed

export default function RecordsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce search or just fetch on effect
  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/records?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            setRecords(data);
        } else {
            console.error('Invalid response format', data);
            setRecords([]);
        }
      })
      .catch(err => console.error('Failed to fetch records', err))
      .finally(() => setLoading(false));
  }, [searchQuery, statusFilter]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />

      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 3 }}>
            All Records
          </Typography>
          
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            {/* Search Bar */}
            <Paper
              component="form"
              onSubmit={(e) => e.preventDefault()}
              sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400, borderRadius: 2 }}
            >
              <IconButton sx={{ p: '10px' }} aria-label="search">
                <SearchIcon />
              </IconButton>
              <InputBase 
                sx={{ ml: 1, flex: 1 }} 
                placeholder="Search by name or category..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Paper>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1 }}>
               {['verified', 'pending_review', 'active', 'archived'].map((status) => (
                 <Chip 
                   key={status}
                   label={status.replace('_', ' ')}
                   onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                   variant={statusFilter === status ? 'filled' : 'outlined'}
                   color={statusFilter === status ? 'secondary' : 'default'}
                   sx={{ textTransform: 'capitalize' }}
                 />
               ))}
            </Box>
          </Stack>
        </Box>

        {/* Results */}
        <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3 }}>
          {/* Header Row */}
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '40%', fontWeight: 600, color: 'text.secondary' }}>Document Name</Box>
            <Box sx={{ width: '25%', fontWeight: 600, color: 'text.secondary' }}>Category</Box>
            <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary' }}>Date</Box>
            <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary' }}>Status</Box>
          </Box>
          
          {loading ? (
             <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>
          ) : records.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              No records found.
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
                <Box sx={{ width: '40%', display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  <Typography fontWeight="500">{record.title}</Typography>
                </Box>
                <Box sx={{ width: '25%' }}>
                   <Chip label={record.category} size="small" sx={{ bgcolor: 'secondary.light', color: 'white', fontWeight: 600 }} />
                </Box>
                <Box sx={{ width: '20%', color: 'text.secondary' }}>
                  {new Date(record.createdAt).toLocaleDateString()}
                </Box>
                <Box sx={{ width: '15%' }}>
                   <Chip 
                     label={record.status.replace('_', ' ')} 
                     size="small" 
                     variant="outlined" 
                     color={record.status === 'verified' ? 'success' : 'default'}
                   />
                </Box>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Box>
  );
}
