'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import { useRouter } from 'next/navigation';

interface CompanyRecordListProps {
  records: any[];
  loading?: boolean;
}

export default function CompanyRecordList({ records, loading }: CompanyRecordListProps) {
  const router = useRouter();

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading records...</Box>;
  }

  if (!records || records.length === 0) {
    return <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No records found for this company.</Box>;
  }

  return (
    <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      {/* Header Row */}
      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '45%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
           Document Name
        </Box>
        <Box sx={{ width: '25%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
           Classification
        </Box>
        <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
           Date
        </Box>
        <Box sx={{ width: '15%', fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
           Status
        </Box>
      </Box>
      
      {records.map((record: any) => (
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
          {/* Document Name & Icon */}
          <Box sx={{ width: '45%', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: record.versions?.[0]?.fileType === 'pdf' ? '#ffe4e6' : '#e0f2fe',
                color: record.versions?.[0]?.fileType === 'pdf' ? '#f43f5e' : '#0ea5e9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {record.versions?.[0]?.fileType === 'pdf' ? <PictureAsPdfIcon fontSize="small" /> : <DescriptionIcon fontSize="small" />}
            </Box>
            <Box>
                <Typography fontWeight="500" fontSize="0.95rem">{record.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {record.referenceNumber || 'No Ref'}
                </Typography>
            </Box>
          </Box>

          {/* Classification */}
          <Box sx={{ width: '25%' }}>
             <Chip 
                label={record.classificationNode?.name || record.recordType?.name || 'General'} 
                size="small" 
                variant="outlined"
                sx={{ borderColor: '#cbd5e1', color: '#475569', fontWeight: 500 }} 
             />
          </Box>

          {/* Date */}
          <Box sx={{ width: '15%', color: 'text.secondary', fontSize: '0.875rem' }}>
            {new Date(record.createdAt).toLocaleDateString()}
          </Box>

          {/* Status */}
          <Box sx={{ width: '15%' }}>
              <Chip 
               label={record.status.replace('_', ' ')} 
               size="small" 
               variant={['ACTIVE', 'verified'].includes(record.status) ? 'filled' : 'outlined'}
               color={
                   ['ACTIVE', 'verified'].includes(record.status) ? 'success' : 
                   record.status === 'ARCHIVED' ? 'default' :
                   'warning'
               }
               sx={{ fontWeight: 500, fontSize: '0.75rem', height: 24 }}
             />
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
