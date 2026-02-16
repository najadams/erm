'use client';

import React, { useState, useMemo, Suspense } from 'react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Slide from '@mui/material/Slide';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter, useSearchParams } from 'next/navigation';

import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import ClearIcon from '@mui/icons-material/Clear';
import type { Record } from '@/types';
import AdvancedSearch from '@/components/AdvancedSearch';
import BatchAccessRequestDialog from '@/components/BatchAccessRequestDialog';

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
      recordTypeId: '',
      registeredCompanyId: '',
      sector: ''
  });
  const [recordTypes, setRecordTypes] = useState<any[]>([]); // Flat list or grouped

  // Multi-select state
  const [selectedRecords, setSelectedRecords] = useState<Map<string, { id: string; title: string; referenceNumber?: string }>>(new Map());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  const handleToggleSelect = (record: any, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedRecords(prev => {
      const next = new Map(prev);
      if (next.has(record.id)) {
        next.delete(record.id);
      } else {
        next.set(record.id, {
          id: record.id,
          title: record.title,
          referenceNumber: record.referenceNumber
        });
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Map());
    } else {
      const all = new Map<string, { id: string; title: string; referenceNumber?: string }>();
      records.forEach(r => all.set(r.id, { id: r.id, title: r.title, referenceNumber: (r as any).referenceNumber }));
      setSelectedRecords(all);
    }
  };

  const handleClearSelection = () => {
    setSelectedRecords(new Map());
  };

  const handleRemoveFromSelection = (recordId: string) => {
    setSelectedRecords(prev => {
      const next = new Map(prev);
      next.delete(recordId);
      return next;
    });
  };

  const handleBatchRequestSuccess = () => {
    setSelectedRecords(new Map());
    setBatchDialogOpen(false);
  };

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
  // SWR Fetcher
  const fetcher = (url: string) => fetch(url).then((res) => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json();
  });

  // Construct Query String for SWR Key
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    if (filters.groupId) params.set('groupId', filters.groupId);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.recordTypeId) params.set('recordTypeId', filters.recordTypeId);
    if (filters.registeredCompanyId) params.set('registeredCompanyId', filters.registeredCompanyId);
    if (filters.sector) params.set('sector', filters.sector);
    return params.toString();
  }, [filters]);

  const { data: recordsData, error, isLoading } = useSWR(`/api/records?${queryString}`, fetcher, {
      refreshInterval: 5000,
      keepPreviousData: true // UX: Keep old list while fetching new filter results
  });

  const records = Array.isArray(recordsData) ? recordsData : [];
  // const loading = isLoading; // Use SWR's isLoading or isValidating

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 3 }}>
          All Records
        </Typography>
        
        <AdvancedSearch 
           initialValues={{ q: initialQuery }}
           onSearch={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))} 
           recordTypes={recordTypes}
        />
      </Box>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
             Showing <b>{records.length}</b> records
             {/* Future: Add 'sort by' indicator here */}
          </Typography>
      </Box>

      {/* Results */}
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3 }}>
        {/* Header Row */}
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Checkbox
              checked={records.length > 0 && selectedRecords.size === records.length}
              indeterminate={selectedRecords.size > 0 && selectedRecords.size < records.length}
              onChange={handleSelectAll}
              size="small"
            />
          </Box>
          <Box sx={{ width: 'calc(40% - 48px)', fontWeight: 600, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>
             Document Name
          </Box>
          <Box sx={{ width: '25%', fontWeight: 600, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>
             Type
          </Box>
          <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>
             Date ↓
          </Box>
          <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary' }}>
             Status
          </Box>
        </Box>
        
        {isLoading ? (
           <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
             <CircularProgress size={32} sx={{ mb: 2 }} />
             <Typography variant="body2">Loading records...</Typography>
           </Box>
        ) : records.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
            <DescriptionIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
              {filters.q || filters.status ? 'No matching records' : 'No records yet'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {filters.q || filters.status
                ? 'Try adjusting your search or filters.'
                : 'Upload your first document to get started.'}
            </Typography>
            {!filters.q && !filters.status && (
              <Button variant="contained" startIcon={<LockPersonIcon />} onClick={() => router.push('/upload')}>
                Upload Document
              </Button>
            )}
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
                bgcolor: selectedRecords.has(record.id) ? 'primary.50' : 'inherit',
                '&:hover': { bgcolor: selectedRecords.has(record.id) ? 'primary.100' : '#f8fafc', cursor: 'pointer' },
                transition: 'background-color 0.2s'
              }}
              onClick={() => router.push(`/records/${record.id}`)}
            >
              <Box sx={{ width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Checkbox
                  checked={selectedRecords.has(record.id)}
                  onClick={(e) => handleToggleSelect(record, e)}
                  size="small"
                />
              </Box>
              <Box sx={{ width: 'calc(40% - 48px)', display: 'flex', alignItems: 'center', gap: 2 }}>
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
              <Box sx={{ width: '15%', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip
                   label={record.isLocked ? `${record.status} (LOCKED)` : record.status}
                   size="small"
                   variant="outlined"
                   color={
                       record.isLocked ? 'error' :
                       record.status === 'REGISTERED' ? 'success' :
                       record.status === 'SUBMITTED' ? 'info' :
                       record.status === 'ARCHIVED' ? 'warning' :
                       'default'
                   }
                   sx={{ fontWeight: 500 }}
                 />
              </Box>
            </Box>
          ))
        )}
      </Paper>

      {/* Floating Selection Action Bar */}
      <Slide direction="up" in={selectedRecords.size > 0} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 3,
            py: 1.5,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'primary.main',
            color: 'white',
            zIndex: 1000
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
          </Typography>
          <Button
            variant="contained"
            color="inherit"
            size="small"
            startIcon={<LockPersonIcon />}
            onClick={() => setBatchDialogOpen(true)}
            sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Request Access
          </Button>
          <IconButton size="small" onClick={handleClearSelection} sx={{ color: 'white' }}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Slide>

      {/* Batch Access Request Dialog */}
      <BatchAccessRequestDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        selectedRecords={Array.from(selectedRecords.values())}
        onRemoveRecord={handleRemoveFromSelection}
        onSuccess={handleBatchRequestSuccess}
      />
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
