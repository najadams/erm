'use client';

import React, { useState, useMemo, Suspense } from 'react';
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
import AdvancedSearch from '@/components/AdvancedSearch';

export const dynamic = 'force-dynamic';

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  /* State */
  const [filters, setFilters] = useState({
      q: initialQuery,
      status: '',
      groupId: '',
      startDate: '',
      endDate: '',
      tag: '',
      uploader: ''
  });
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch records when filters change
  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    if (filters.groupId) params.set('groupId', filters.groupId);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

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
  }, [filters]);

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 3 }}>
          All Records
        </Typography>
        
        <AdvancedSearch 
           initialValues={{ q: initialQuery }}
           onSearch={(newFilters) => setFilters(newFilters)} 
        />
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
  );
}

export default function RecordsPage() {
  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar />
      <Suspense fallback={<Box p={4}>Loading...</Box>}>
        <RecordsContent />
      </Suspense>
    </Box>
  );
}
