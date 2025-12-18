'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShareIcon from '@mui/icons-material/Share';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CategoryIcon from '@mui/icons-material/Category';
import ArticleIcon from '@mui/icons-material/Article';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Collapse from '@mui/material/Collapse';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  requiresRole?: string[];
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <FolderIcon />, href: '/' },
  { label: 'All Records', icon: <DescriptionIcon />, href: '/records' },
  {label: "Register New File", icon: <CloudUploadIcon />, href:'/upload'}
  // { label: 'Archived', icon: <ArchiveIcon />, href: '/records?filter=archived' },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Classifications', icon: <CategoryIcon />, href: '/admin/classifications', requiresRole: ['ADMIN', 'RECORDS_MANAGER'] },
  { label: 'Metadata Templates', icon: <ArticleIcon />, href: '/admin/metadata-templates', requiresRole: ['ADMIN', 'RECORDS_MANAGER'] },
  { label: 'Users', icon: <PeopleIcon />, href: '/admin/users', requiresRole: ['ADMIN'] },
  { label: 'Groups', icon: <FolderIcon />, href: '/admin/groups', requiresRole: ['ADMIN'] },
];

const SETTINGS_NAV_ITEMS: NavItem[] = [
  { label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(true);

  const userRole = (session?.user as any)?.role || 'USER';
  const sidebarWidth = isCollapsed ? 80 : 280;

  const canAccess = (item: NavItem): boolean => {
    if (!item.requiresRole) return true;
    return item.requiresRole.includes(userRole);
  };

  const hasAdminAccess = ADMIN_NAV_ITEMS.some(item => canAccess(item));

  const renderNavItem = (item: NavItem) => {
    if (!canAccess(item)) return null;
    
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    
    const buttonContent = (
      <Button
        startIcon={isCollapsed ? null : item.icon}
        onClick={() => router.push(item.href)}
        sx={{
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          px: isCollapsed ? 1 : 3,
          py: 1.5,
          borderRadius: 2,
          minWidth: 0,
          color: isActive ? 'secondary.main' : 'rgba(255,255,255,0.7)',
          bgcolor: isActive ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.05)',
            color: 'white',
          },
          flexShrink: 0,
          width: '100%',
        }}
      >
        {isCollapsed ? item.icon : item.label}
      </Button>
    );

    return isCollapsed ? (
      <Tooltip title={item.label} placement="right" arrow key={item.label}>
        {buttonContent}
      </Tooltip>
    ) : (
      <React.Fragment key={item.label}>
        {buttonContent}
      </React.Fragment>
    );
  };

  return (
    <Box
      component="nav"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        bgcolor: 'primary.main',
        color: 'white',
        p: 2,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        height: '100%', 
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}
    >
      {/* Header & Toggle */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        mb: 4, 
        minHeight: 40
      }}>
        {!isCollapsed && (
          <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1, whiteSpace: 'nowrap' }}>
            ERMS <span style={{ color: '#0ea5e9' }}>GIPC</span>
          </Typography>
        )}
        <IconButton onClick={() => setIsCollapsed(!isCollapsed)} sx={{ color: 'white' }}>
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1, 
        flexGrow: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0, 
        mb: 2 
      }}>
        {/* Main Navigation */}
        {MAIN_NAV_ITEMS.map(renderNavItem)}

        {/* Administration Section */}
        {hasAdminAccess && !isCollapsed && (
          <Box sx={{ mt: 2 }}>
            <Button
              onClick={() => setAdminExpanded(!adminExpanded)}
              sx={{
                justifyContent: 'flex-start',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                minWidth: 0,
                color: 'rgba(255,255,255,0.9)',
                bgcolor: 'rgba(255,255,255,0.05)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
                width: '100%',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
              startIcon={<AdminPanelSettingsIcon />}
              endIcon={adminExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              Administration
            </Button>
            <Collapse in={adminExpanded}>
              <Box sx={{ pl: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {ADMIN_NAV_ITEMS.map(renderNavItem)}
              </Box>
            </Collapse>
          </Box>
        )}

        {hasAdminAccess && isCollapsed && (
          <Box sx={{ mt: 2 }}>
            {ADMIN_NAV_ITEMS.filter(canAccess).map(item => (
              <Tooltip title={item.label} placement="right" arrow key={item.label}>
                <Button
                  onClick={() => router.push(item.href)}
                  sx={{
                    justifyContent: 'center',
                    px: 1,
                    py: 1.5,
                    borderRadius: 2,
                    minWidth: 0,
                    color: pathname.startsWith(item.href) ? 'secondary.main' : 'rgba(255,255,255,0.7)',
                    bgcolor: pathname.startsWith(item.href) ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                      color: 'white',
                    },
                    width: '100%',
                  }}
                >
                  {item.icon}
                </Button>
              </Tooltip>
            ))}
          </Box>
        )}

        {/* Settings Section */}
        {SETTINGS_NAV_ITEMS.map(renderNavItem)}
      </Box>

      {/* Logout Button Section */}
      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        {isCollapsed ? (
             <Tooltip title="Logout" placement="right" arrow>
                <Button
                  fullWidth
                  onClick={() => {
                      import('next-auth/react').then(({ signOut }) => signOut());
                  }}
                  sx={{
                    justifyContent: 'center',
                    minWidth: 0,
                    py: 1.5,
                    borderRadius: 2,
                    color: 'rgba(255,99,71,0.9)', 
                    '&:hover': {
                      bgcolor: 'rgba(255,99,71,0.1)',
                      color: '#ff6347',
                    },
                  }}
                >
                  <LogoutIcon />
                </Button>
             </Tooltip>
        ) : (
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
        )}
      </Box>
    </Box>
  );
}
