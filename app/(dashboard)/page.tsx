'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/GridLegacy';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import ScheduleIcon from '@mui/icons-material/Schedule';



import RecentRecords from '@/components/dashboard/RecentRecords';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import UploadRecordModal from '@/components/dashboard/UploadRecordModal';
import StatsCards from '@/components/dashboard/StatsCards';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Box p={4}>Loading...</Box>;
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/records?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
        <Box>
          <Typography variant="h3" fontWeight="bold" className="premium-gradient-text" sx={{ mb: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back. Here&apos;s what&apos;s happening.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Search Redirect */}
          <Paper
            component="form"
            onSubmit={handleSearch}
            className="glass-panel"
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              width: 300,
              borderRadius: 2,
              border: 'none' // managed by class
            }}
          >
            <IconButton sx={{ p: '10px', color: 'text.secondary' }} aria-label="search" onClick={handleSearch}>
              <SearchIcon />
            </IconButton>
            <InputBase 
              sx={{ ml: 1, flex: 1 }} 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Paper>
            <Button 
            variant="outlined" 
            onClick={() => router.push('/records')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Advanced Search
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Record
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <StatsCards />

      {/* Recent Records Table */}
      <RecentRecords />

      {/* Activity Feed */}
      <Box sx={{ mt: 4 }}>
        <ActivityFeed />
      </Box>

      {/* Upload Modal */}
      <UploadRecordModal 
        open={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onUploadSuccess={() => {
          console.log('Refresh list...');
        }} 
      />
    </React.Fragment>
  );
}
