'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto', bgcolor: 'background.default' }}>
        {children}
      </Box>
    </Box>
  );
}
