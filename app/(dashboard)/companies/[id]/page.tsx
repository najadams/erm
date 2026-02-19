'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import BusinessIcon from '@mui/icons-material/Business';
import { useRouter, useParams } from 'next/navigation';
import CompanyRecordList from '@/components/CompanyRecordList';
import ClassificationBrowser from '@/components/ClassificationBrowser';

export default function CompanyDashboard() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  // Fallback if id is not yet available (though usually it is in client component after hydration)
  const displayId = id || '';
  const [company, setCompany] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassificationId, setSelectedClassificationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            // 1. Fetch Company
            const compRes = await fetch(`/api/companies/${id}`);
            if (compRes.ok) {
                const compData = await compRes.json();
                setCompany(compData);
            }

            // 2. Fetch Records with optional classification filter
            let recordsUrl = `/api/records?registeredCompanyId=${id}`;
            if (selectedClassificationId) {
                recordsUrl += `&classificationNodeId=${selectedClassificationId}`;
            }

            const recordsRes = await fetch(recordsUrl);
            if (recordsRes.ok) {
                const recoData = await recordsRes.json();
                setRecords(recoData?.records ?? (Array.isArray(recoData) ? recoData : []));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    if (id) fetchData();
  }, [id, selectedClassificationId]);

  return (
    <Box sx={{ flexGrow: 1, p: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => router.back()} 
            sx={{ mb: 2, color: 'text.secondary' }}
        >
            Back
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: 'primary.main', borderRadius: 2, color: 'white', display: 'flex' }}>
                <BusinessIcon fontSize="large" />
            </Box>
            <Box>
                {loading ? (
                    <Typography variant="h4">Loading...</Typography>
                ) : (
                    <>
                        <Typography variant="h4" fontWeight="bold">
                            {company?.name || 'Company Not Found'}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                #{company?.registrationNumber || displayId}
                            </Typography>
                            <Chip size="small" label={company?.sector || 'Sector N/A'} color="primary" variant="outlined" />
                            <Chip size="small" label={company?.investorType || 'Type N/A'} variant="outlined" />
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            {company?.subSectors?.map((sub: string) => (
                                <Chip key={sub} size="small" label={sub} sx={{ bgcolor: 'action.hover' }} />
                            ))}
                            {company?.strategicTags?.map((tag: string) => (
                                <Chip key={tag} size="small" label={tag} color="success" variant="filled" />
                            ))}
                        </Stack>
                    </>
                )}
            </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: { md: 'flex' }, gap: 4 }}>
        {/* Left Sidebar: Classification Tree */}
        <Box sx={{ width: { xs: '100%', md: '25%' }, mb: { xs: 3, md: 0 } }}>
            <Paper sx={{ p: 2, borderRadius: 3, minHeight: 400 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon fontSize="small" /> BROWSE BY TYPE
                </Typography>
                <ClassificationBrowser 
                    selectedId={selectedClassificationId} 
                    onSelect={setSelectedClassificationId} 
                />
            </Paper>
        </Box>

        {/* Right Content: Records */}
        <Box sx={{ width: { xs: '100%', md: '75%' } }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="600">
                    Documents
                </Typography>
                <Button variant="contained" onClick={() => router.push(`/upload?companyId=${id}`)}>
                    Upload New
                </Button>
            </Box>
            
            <CompanyRecordList records={records} loading={loading} />
        </Box>
      </Box>
    </Box>
  );
}
