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

import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import type { Record } from '@/types';
import AdvancedSearch from '@/components/AdvancedSearch';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Finance', 'HR', 'Engineering', 'Marketing', 'Legal', 'Operations'];

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
      uploader: '',
      recordTypeId: ''
  });
  const [records, setRecords] = useState<Record[]>([]);
  const [recordTypes, setRecordTypes] = useState<any[]>([]); // Flat list or grouped
  const [loading, setLoading] = useState(false);

  // Fetch Record Types for Filter
  React.useEffect(() => {
    fetch('/api/record-types')
      .then(res => res.json())
      .then(data => {
        // Flatten for simple dropdown
        const flatTypes: any[] = [];
        data.forEach((cat: any) => {
            if (cat.recordTypes) flatTypes.push(...cat.recordTypes);
        });
        setRecordTypes(flatTypes);
      })
      .catch(err => console.error('Failed to load types', err));
  }, []);

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
    if (filters.recordTypeId) params.set('recordTypeId', filters.recordTypeId);

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
        
        {/* Simple Type Filter (Can be moved to AdvancedSearch later) */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <Box component="select" 
                value={filters.recordTypeId}
                onChange={(e: any) => setFilters({...filters, recordTypeId: e.target.value})}
                sx={{ p: 1, paddingRight: 4, borderRadius: 1, borderColor: '#ccc' }}
            >
                <option value="">All Types</option>
                {recordTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </Box>
        </Box>

        <AdvancedSearch 
           initialValues={{ q: initialQuery }}
           onSearch={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))} 
        />
      </Box>

      {/* Results */}
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3 }}>
        {/* Header Row */}
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '40%', fontWeight: 600, color: 'text.secondary' }}>Document Name</Box>
          <Box sx={{ width: '25%', fontWeight: 600, color: 'text.secondary' }}>Type</Box>
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
          records.map((record: any) => (
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
                    bgcolor: record.versions?.[0]?.fileType === 'pdf' ? '#ffe4e6' : '#e0f2fe',
                    color: record.versions?.[0]?.fileType === 'pdf' ? '#f43f5e' : '#0ea5e9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {record.versions?.[0]?.fileType === 'pdf' ? <PictureAsPdfIcon /> : <DescriptionIcon />}
                </Box>
                <Box>
                    <Typography fontWeight="500">{record.title}</Typography>
                    {/* Show first metadata value as snippet if available */}
                    {record.metadata?.[0] && (
                        <Typography variant="caption" color="text.secondary">
                           {record.metadata[0].metadataField?.label}: {record.metadata[0].value}
                        </Typography>
                    )}
                </Box>
              </Box>
              <Box sx={{ width: '25%' }}>
                 <Chip 
                    label={record.recordType?.name || 'General'} 
                    size="small" 
                    sx={{ bgcolor: 'secondary.light', color: 'white', fontWeight: 600 }} 
                 />
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
    <Suspense fallback={<Box p={4}>Loading...</Box>}>
      <RecordsContent />
    </Suspense>
  );
}
