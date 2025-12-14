'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import ArchiveIcon from '@mui/icons-material/Archive';
import ShareIcon from '@mui/icons-material/Share';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People'; // Added for User Management
import LogoutIcon from '@mui/icons-material/Logout';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <FolderIcon />, href: '/', active: true },
  { label: 'All Records', icon: <DescriptionIcon />, href: '/records', active: false },
  { label: 'Shared with Me', icon: <ShareIcon />, href: '/records?filter=shared', active: false },
  { label: 'Archived', icon: <ArchiveIcon />, href: '/records?filter=archived', active: false },
  { label: 'User Management', icon: <PeopleIcon />, href: '/admin/users', active: false }, // Added for Admin
  { label: 'Groups', icon: <FolderIcon />, href: '/admin/groups', active: false }, // Added for Admin
  { label: 'Settings', icon: <SettingsIcon />, href: '/settings', active: false },
];

import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      sx={{
        width: 280,
        flexShrink: 0,
        bgcolor: 'primary.main',
        color: 'white',
        p: 3,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        height: '100%', 
        // position: 'sticky', // Removed as we are using fixed layout
        // top: 0
      }}
    >
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 6, letterSpacing: 1 }}>
        ERMS <span style={{ color: '#0ea5e9' }}>GIPC</span>
      </Typography>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1, 
        flexGrow: 1, 
        overflowY: 'auto', // Allow scrolling for list items
        minHeight: 0, // Flex child scroll fix
        mb: 2 // Space before footer
      }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Button
              key={item.label}
              startIcon={item.icon}
              onClick={() => router.push(item.href)}
              sx={{
                justifyContent: 'flex-start',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                color: isActive ? 'secondary.main' : 'rgba(255,255,255,0.7)',
                bgcolor: isActive ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'white',
                },
                flexShrink: 0 // Prevent button shrinking
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Box>

      {/* Logout Button Section */}
      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <Button
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={() => {
              import('next-auth/react').then(({ signOut }) => signOut());
          }}
          sx={{
            justifyContent: 'flex-start',
            px: 3,
            py: 1.5,
            borderRadius: 2,
            color: 'rgba(255,99,71,0.9)', 
            '&:hover': {
              bgcolor: 'rgba(255,99,71,0.1)',
              color: '#ff6347',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
}
