'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AssessmentIcon from '@mui/icons-material/Assessment';
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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ArchiveIcon from '@mui/icons-material/Archive';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GavelIcon from '@mui/icons-material/Gavel';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SecurityIcon from '@mui/icons-material/Security';
import BusinessIcon from '@mui/icons-material/Business';

import ExtensionIcon from '@mui/icons-material/Extension';
import SendIcon from '@mui/icons-material/Send';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Collapse from '@mui/material/Collapse';

import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  requiresRole?: string[];
  badgeKey?: string;
}

import { ROLES, mapLegacyRole } from '@/lib/permissions';

// Lifecycle Navigation Structure
const WORKSPACE_NAV: NavItem[] = [
  { label: 'Dashboard', icon: <FolderIcon />, href: '/' },
  { label: 'Projects', icon: <BusinessIcon />, href: '/projects' },
  { label: 'My Uploads', icon: <CloudUploadIcon />, href: '/upload/my-uploads' },
  { label: 'My Requests', icon: <SendIcon />, href: '/my-requests', badgeKey: 'myPendingRequests' },
  { label: 'Pending Verification', icon: <FactCheckIcon />, href: '/upload/verification', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER, ROLES.APPROVER], badgeKey: 'pendingDocs' },
];

const RECORDS_NAV: NavItem[] = [
  { label: 'Official Records', icon: <DescriptionIcon />, href: '/records' }, 
  { label: 'Archives', icon: <ArchiveIcon />, href: '/records/archives' }, 
];

const GOVERNANCE_NAV: NavItem[] = [
    { label: 'Retention Schedules', icon: <AccessTimeIcon />, href: '/governance/retention', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER] },
    { label: 'Legal Holds', icon: <GavelIcon />, href: '/governance/legal-holds', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER] },
    { label: 'Disposition Queue', icon: <DeleteSweepIcon />, href: '/governance/disposition', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER] },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Access Requests', icon: <LockOpenIcon />, href: '/admin/access-requests', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER], badgeKey: 'pendingAccessRequests' },
  { label: 'System Health', icon: <AssessmentIcon />, href: '/admin/system-health', requiresRole: [ROLES.ADMIN, ROLES.AUDITOR] },
  { label: 'Registered Companies', icon: <BusinessIcon />, href: '/admin/companies', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER] },
  { label: 'System Audit Logs', icon: <SecurityIcon />, href: '/admin/audit', requiresRole: [ROLES.ADMIN, ROLES.AUDITOR] }, 
  { label: 'Classifications', icon: <CategoryIcon />, href: '/admin/classifications', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER] },
  { label: 'Metadata Templates', icon: <ArticleIcon />, href: '/admin/metadata-templates', requiresRole: [ROLES.ADMIN, ROLES.RECORDS_OFFICER] },
  { label: 'Integration Keys', icon: <ExtensionIcon />, href: '/admin/integrations', requiresRole: [ROLES.ADMIN] },
  { label: 'Users & Roles', icon: <PeopleIcon />, href: '/admin/users', requiresRole: [ROLES.ADMIN] },
  { label: 'Groups', icon: <FolderIcon />, href: '/admin/groups', requiresRole: [ROLES.ADMIN] },
];

const SETTINGS_NAV_ITEMS: NavItem[] = [
  { label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
];

// ...

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch badge counts
  const statsFetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null);
  const { data: stats } = useSWR('/api/stats', statsFetcher, { refreshInterval: 30000, revalidateOnFocus: true });

  const getBadgeCount = (key?: string): number => {
    if (!key || !stats) return 0;
    if (key === 'pendingDocs') return stats.documents?.pending || 0;
    return stats[key] || 0;
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    records: true,
    governance: true,
    admin: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Map legacy/db role to canonical role
  const userRole = mapLegacyRole((session?.user as any)?.role);
  const sidebarWidth = isCollapsed ? 80 : 280;

  const canAccess = (item: NavItem): boolean => {
    if (!item.requiresRole) return true;
    return item.requiresRole.includes(userRole);
  };

  const renderNavItem = (item: NavItem) => {
    if (!canAccess(item)) return null;

    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    const badgeCount = getBadgeCount(item.badgeKey);

    const icon = badgeCount > 0 ? (
      <Badge badgeContent={badgeCount} color="error" max={99} sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
        {item.icon}
      </Badge>
    ) : item.icon;

    const buttonContent = (
      <Button
        startIcon={isCollapsed ? null : icon}
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
        {isCollapsed ? icon : (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>{item.label}</span>
            {badgeCount > 0 && !isCollapsed && (
              <Chip label={badgeCount} size="small" color="error" sx={{ height: 20, fontSize: '0.65rem', ml: 1 }} />
            )}
          </Box>
        )}
      </Button>
    );

    return isCollapsed ? (
      <Tooltip title={`${item.label}${badgeCount > 0 ? ` (${badgeCount})` : ''}`} placement="right" arrow key={item.label}>
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
      className="glass-sidebar"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        // bgcolor: 'primary.main', // Removed for glass effect
        color: 'white',
        p: 2,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        height: '100vh',
        position: 'sticky',
        top: 0,
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
        {/* Workspace Section */}
        <Box sx={{ mb: 2 }}>
          {(!isCollapsed) && (
            <Box
              onClick={() => toggleSection('workspace')}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 3, py: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, borderRadius: 1 }}
            >
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
                My Workspace
              </Typography>
              {openSections.workspace ? <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /> : <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />}
            </Box>
          )}
          <Collapse in={isCollapsed || openSections.workspace}>
            {WORKSPACE_NAV.map(renderNavItem)}
          </Collapse>
        </Box>

         {/* Records Section */}
        <Box sx={{ mb: 2 }}>
          {(!isCollapsed) && (
            <Box
              onClick={() => toggleSection('records')}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 3, py: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, borderRadius: 1 }}
            >
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
                Records Repository
              </Typography>
              {openSections.records ? <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /> : <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />}
            </Box>
          )}
          <Collapse in={isCollapsed || openSections.records}>
            {RECORDS_NAV.map(renderNavItem)}
          </Collapse>
        </Box>

         {/* Governance Section - Role Based */}
         {(GOVERNANCE_NAV.some(canAccess)) && (
            <Box sx={{ mb: 2 }}>
               {(!isCollapsed) && (
                 <Box
                   onClick={() => toggleSection('governance')}
                   sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 3, py: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, borderRadius: 1 }}
                 >
                   <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
                     Governance
                   </Typography>
                   {openSections.governance ? <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /> : <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />}
                 </Box>
               )}
               <Collapse in={isCollapsed || openSections.governance}>
                 {GOVERNANCE_NAV.map(renderNavItem)}
               </Collapse>
            </Box>
         )}

         {/* Administration Section - Role Based */}
         {(ADMIN_NAV.some(canAccess)) && (
            <Box sx={{ mb: 2 }}>
               {(!isCollapsed) && (
                 <Box
                   onClick={() => toggleSection('admin')}
                   sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 3, py: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, borderRadius: 1 }}
                 >
                   <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
                     Administration
                   </Typography>
                   {openSections.admin ? <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /> : <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />}
                 </Box>
               )}
               <Collapse in={isCollapsed || openSections.admin}>
                 {ADMIN_NAV.map(renderNavItem)}
               </Collapse>
            </Box>
         )}
        
        {/* Settings Section */}
        <Box sx={{ mt: 'auto' }}>
            {SETTINGS_NAV_ITEMS.map(renderNavItem)}
        </Box>
      </Box>

      {/* Logout Button Section */}
      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        {isCollapsed ? (
             <Tooltip title="Logout" placement="right" arrow>
                <Button
                  fullWidth
                  onClick={() => {
                      import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
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
                  import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
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
