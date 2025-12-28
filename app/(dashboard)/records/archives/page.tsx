'use client';

import React, { useState, Suspense } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';

import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { useRouter } from 'next/navigation';
import type { Record } from '@/types';

function ArchivesContent() {
  const router = useRouter();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/records?status=ARCHIVED')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setRecords(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
          Archives
        </Typography>
        <Typography variant="body1" color="text.secondary">
            Records that have been archived.
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3 }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '40%', fontWeight: 600, color: 'text.secondary' }}>Document Name</Box>
          <Box sx={{ width: '25%', fontWeight: 600, color: 'text.secondary' }}>Type</Box>
          <Box sx={{ width: '20%', fontWeight: 600, color: 'text.secondary' }}>Date Archived</Box>
          <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary' }}>Actions</Box>
        </Box>
        
        {loading ? (
           <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>
        ) : records.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            No archived records found.
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
                '&:hover': { bgcolor: '#f8fafc' } 
              }}
            >
              <Box sx={{ width: '40%', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: '#e2e8f0',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DescriptionIcon />
                </Box>
                <Typography fontWeight="500">{record.title}</Typography>
              </Box>
              <Box sx={{ width: '25%' }}>
                 <Chip label={record.recordType?.name || 'General'} size="small" />
              </Box>
              <Box sx={{ width: '20%', color: 'text.secondary' }}>
                {/* Use updatedAt or audit log for archived date ideally, using createdAt for now */}
                {new Date(record.updatedAt).toLocaleDateString()}
              </Box>
              <Box sx={{ width: '15%' }}>
                 <IconButton size="small" onClick={() => router.push(`/records/${record.id}`)}>
                    <VisibilityIcon fontSize="small" />
                 </IconButton>
                 {/* Potential Restore Action */}
              </Box>
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
}

export default function ArchivesPage() {
  return (
      <Suspense fallback={<Box p={4}>Loading...</Box>}>
        <ArchivesContent />
      </Suspense>
  );
}
