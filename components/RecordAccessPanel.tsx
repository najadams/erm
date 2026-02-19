'use client';

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Fade from '@mui/material/Fade';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';

// Icons
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import ShieldIcon from '@mui/icons-material/Shield';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import UserSearch from '@/components/UserSearch';

// =============================================================================
// TYPES
// =============================================================================

interface AccessEntry {
  id: string;
  principalType: string;
  level: string;
  accessType: string;
  expiresAt?: string;
  user?: { id: string; name: string; email: string };
  group?: { id: string; name: string };
}

interface InheritedEntry {
  source: string;
  level: string;
  description: string;
}

interface RecordAccessPanelProps {
  recordId: string;
  canManageAccess: boolean;
  isAdmin: boolean;
  onMutate: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCESS_LEVELS = [
  { value: 'VIEW',          label: 'View',          icon: <VisibilityIcon fontSize="small" />, color: '#3b82f6', desc: 'Read metadata and download files' },
  { value: 'COMMENT',       label: 'Comment',       icon: <EditIcon fontSize="small" />,       color: '#8b5cf6', desc: 'View + leave comments' },
  { value: 'EDIT_METADATA', label: 'Edit Meta',     icon: <EditIcon fontSize="small" />,       color: '#f59e0b', desc: 'Modify metadata fields' },
  { value: 'EDIT_CONTENT',  label: 'Edit Content',  icon: <EditIcon fontSize="small" />,       color: '#f97316', desc: 'Upload new file versions' },
  { value: 'GOVERNANCE',    label: 'Governance',    icon: <SecurityIcon fontSize="small" />,   color: '#ef4444', desc: 'Lock, classify, archive' },
  { value: 'FULL',          label: 'Full Access',   icon: <AdminPanelSettingsIcon fontSize="small" />, color: '#10b981', desc: 'All permissions including admin' },
];

function getLevelInfo(level: string) {
  return ACCESS_LEVELS.find(l => l.value === level) || ACCESS_LEVELS[0];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Modern radio button card for selecting access level */
function AccessLevelRadioCard({
  level,
  selected,
  onChange,
  disabled,
}: {
  level: typeof ACCESS_LEVELS[0];
  selected: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <Paper
      onClick={disabled ? undefined : onChange}
      elevation={0}
      sx={{
        p: 1.5,
        border: '2px solid',
        borderColor: selected ? level.color : 'transparent',
        bgcolor: selected ? `${level.color}08` : 'grey.50',
        borderRadius: 2,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': disabled ? {} : {
          borderColor: `${level.color}80`,
          bgcolor: `${level.color}0A`,
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${level.color}15`,
        },
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Radio
        checked={selected}
        onChange={onChange}
        disabled={disabled}
        size="small"
        sx={{
          color: `${level.color}60`,
          '&.Mui-checked': { color: level.color },
          p: 0.5,
        }}
      />
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: `${level.color}15`,
          color: level.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {level.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: selected ? level.color : 'text.primary' }}>
          {level.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {level.desc}
        </Typography>
      </Box>
    </Paper>
  );
}

/** Individual access entry row with modern switch toggle */
function AccessEntryRow({
  entry,
  canManage,
  isAdmin,
  onRevoke,
  onToggleType,
  onChangeLevel,
}: {
  entry: AccessEntry;
  canManage: boolean;
  isAdmin: boolean;
  onRevoke: (id: string) => void;
  onToggleType: (id: string, newType: string) => void;
  onChangeLevel: (id: string, newLevel: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const levelInfo = getLevelInfo(entry.level);
  const isUser = entry.principalType === 'USER';
  const displayName = isUser ? entry.user?.name || entry.user?.email || 'Unknown' : entry.group?.name || 'Unknown Group';
  const subtitle = isUser ? entry.user?.email : 'Group';
  const isExpired = entry.expiresAt && new Date(entry.expiresAt) < new Date();
  const isExpiringSoon = entry.expiresAt && !isExpired &&
    (new Date(entry.expiresAt).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
  const isDeny = entry.accessType === 'DENY';

  return (
    <Fade in timeout={300}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: isDeny ? 'error.200' : isExpired ? 'error.100' : 'grey.200',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: isDeny ? 'error.50' : isExpired ? '#fef2f2' : 'white',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isDeny ? 'error.300' : 'primary.200',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          },
        }}
      >
        {/* Main row */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: isUser ? getAvatarColor(displayName) : '#6366f1',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {isUser ? getInitials(displayName) : <GroupIcon fontSize="small" />}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {displayName}
              </Typography>
              {isDeny && (
                <Chip icon={<BlockIcon />} label="Blocked" size="small" color="error" variant="outlined"
                  sx={{ height: 22, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                />
              )}
              {isExpired && (
                <Chip icon={<WarningAmberIcon />} label="Expired" size="small" color="error" variant="outlined"
                  sx={{ height: 22, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                />
              )}
              {isExpiringSoon && (
                <Chip icon={<ScheduleIcon />} label="Expiring Soon" size="small" color="warning" variant="outlined"
                  sx={{ height: 22, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          </Box>

          {/* Level badge */}
          <Chip
            icon={levelInfo.icon}
            label={levelInfo.label}
            size="small"
            sx={{
              bgcolor: `${levelInfo.color}15`,
              color: levelInfo.color,
              fontWeight: 600,
              border: `1px solid ${levelInfo.color}30`,
              '& .MuiChip-icon': { color: levelInfo.color },
            }}
          />

          {/* Allow/Deny toggle switch */}
          {canManage && isAdmin && (
            <Tooltip title={isDeny ? 'Switch to Allow' : 'Switch to Deny (Block)'}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color={isDeny ? 'error.main' : 'success.main'} fontWeight={600} sx={{ minWidth: 36 }}>
                  {isDeny ? 'Deny' : 'Allow'}
                </Typography>
                <Switch
                  checked={!isDeny}
                  onChange={() => onToggleType(entry.id, isDeny ? 'ALLOW' : 'DENY')}
                  size="small"
                  color="success"
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      '&.Mui-checked': { color: '#10b981' },
                      '&.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b98180' },
                    },
                    '& .MuiSwitch-track': { bgcolor: '#ef444480' },
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {/* Expand/Collapse button */}
          {canManage && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: 'text.secondary' }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>

        {/* Expanded panel */}
        <Collapse in={expanded}>
          <Box sx={{ px: 2.5, pb: 2, pt: 0 }}>
            <Divider sx={{ mb: 2 }} />

            {/* Access Level Radio Cards */}
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permission Level
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
              {ACCESS_LEVELS.map(level => (
                <AccessLevelRadioCard
                  key={level.value}
                  level={level}
                  selected={entry.level === level.value}
                  onChange={() => onChangeLevel(entry.id, level.value)}
                  disabled={!canManage}
                />
              ))}
            </Box>

            {/* Expiry info */}
            {entry.expiresAt && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ScheduleIcon fontSize="small" color={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'action'} />
                <Typography variant="body2" color={isExpired ? 'error.main' : isExpiringSoon ? 'warning.main' : 'text.secondary'}>
                  {isExpired ? 'Expired' : 'Expires'}: {new Date(entry.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
            )}

            {/* Revoke button */}
            {canManage && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => onRevoke(entry.id)}
                sx={{ borderRadius: 2 }}
              >
                Revoke Access
              </Button>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Fade>
  );
}

/** Inherited access indicator */
function InheritedAccessRow({ entry }: { entry: InheritedEntry }) {
  const levelInfo = getLevelInfo(entry.level);

  return (
    <Box
      sx={{
        p: 2,
        border: '1px dashed',
        borderColor: 'grey.300',
        borderRadius: 2,
        bgcolor: 'grey.50',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: '#6366f115',
          color: '#6366f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShieldIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>{entry.source}</Typography>
        <Typography variant="caption" color="text.secondary">{entry.description}</Typography>
      </Box>
      <Chip
        label={levelInfo.label}
        size="small"
        variant="outlined"
        sx={{ color: levelInfo.color, borderColor: `${levelInfo.color}40`, fontWeight: 600 }}
      />
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RecordAccessPanel({ recordId, canManageAccess, isAdmin, onMutate }: RecordAccessPanelProps) {
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState<{ explicit: AccessEntry[]; inherited: InheritedEntry[] }>({ explicit: [], inherited: [] });
  const [error, setError] = useState<string | null>(null);

  // Grant Dialog State
  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedPrincipal, setSelectedPrincipal] = useState<any>(null);
  const [grantForm, setGrantForm] = useState({
    principalType: 'USER',
    level: 'VIEW',
    accessType: 'ALLOW',
  });
  const [grantLoading, setGrantLoading] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<'ALL' | 'USER' | 'GROUP'>('ALL');

  const fetchAccess = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/records/${recordId}/access`);
      if (res.ok) {
        const data = await res.json();
        setAccessData(data);
        setError(null);
      } else {
        setError('Failed to load access data');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccess();
  }, [recordId]);

  const handleRevoke = async (accessId: string) => {
    if (!confirm('Revoke this permission?')) return;
    try {
      const res = await fetch(`/api/records/${recordId}/access?accessId=${accessId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAccess();
        onMutate();
      } else {
        alert('Failed to revoke access');
      }
    } catch {
      alert('Error revoking access');
    }
  };

  const handleToggleType = async (accessId: string, newType: string) => {
    try {
      const entry = accessData.explicit.find(e => e.id === accessId);
      if (!entry) return;

      const res = await fetch(`/api/records/${recordId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalType: entry.principalType,
          principalId: entry.principalType === 'USER' ? entry.user?.id : entry.group?.id,
          level: entry.level,
          accessType: newType,
        }),
      });
      if (res.ok) {
        fetchAccess();
        onMutate();
      }
    } catch {
      alert('Error updating access');
    }
  };

  const handleChangeLevel = async (accessId: string, newLevel: string) => {
    try {
      const entry = accessData.explicit.find(e => e.id === accessId);
      if (!entry) return;

      const res = await fetch(`/api/records/${recordId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalType: entry.principalType,
          principalId: entry.principalType === 'USER' ? entry.user?.id : entry.group?.id,
          level: newLevel,
          accessType: entry.accessType,
        }),
      });
      if (res.ok) {
        fetchAccess();
        onMutate();
      }
    } catch {
      alert('Error updating access level');
    }
  };

  const handleGrant = async () => {
    if (!selectedPrincipal) return;
    setGrantLoading(true);
    try {
      const res = await fetch(`/api/records/${recordId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalType: grantForm.principalType,
          principalId: selectedPrincipal.id,
          level: grantForm.level,
          accessType: grantForm.accessType,
        }),
      });
      if (res.ok) {
        setGrantOpen(false);
        setSelectedPrincipal(null);
        setGrantForm({ principalType: 'USER', level: 'VIEW', accessType: 'ALLOW' });
        fetchAccess();
        onMutate();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to grant access');
      }
    } catch {
      alert('Error granting access');
    } finally {
      setGrantLoading(false);
    }
  };

  // Filter entries
  const filteredEntries = accessData.explicit.filter(e =>
    filterType === 'ALL' || e.principalType === filterType
  );

  const userCount = accessData.explicit.filter(e => e.principalType === 'USER').length;
  const groupCount = accessData.explicit.filter(e => e.principalType === 'GROUP').length;

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading access data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="primary" />
            Access & Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {accessData.explicit.length} explicit grant{accessData.explicit.length !== 1 ? 's' : ''} • {accessData.inherited.length} inherited
          </Typography>
        </Box>
        {canManageAccess && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setGrantOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
              },
            }}
          >
            Grant Access
          </Button>
        )}
      </Box>

      {/* Filter Radios */}
      <Box sx={{ mb: 3 }}>
        <FormControl component="fieldset">
          <RadioGroup
            row
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <FormControlLabel
              value="ALL"
              control={
                <Radio
                  size="small"
                  sx={{
                    '&.Mui-checked': { color: '#3b82f6' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight={filterType === 'ALL' ? 700 : 400}>All</Typography>
                  <Chip label={accessData.explicit.length} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: filterType === 'ALL' ? '#3b82f615' : 'grey.100' }} />
                </Box>
              }
              sx={{ mr: 3, '& .MuiFormControlLabel-label': { ml: 0.5 } }}
            />
            <FormControlLabel
              value="USER"
              control={
                <Radio
                  size="small"
                  sx={{ '&.Mui-checked': { color: '#8b5cf6' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" fontWeight={filterType === 'USER' ? 700 : 400}>Users</Typography>
                  <Chip label={userCount} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: filterType === 'USER' ? '#8b5cf615' : 'grey.100' }} />
                </Box>
              }
              sx={{ mr: 3, '& .MuiFormControlLabel-label': { ml: 0.5 } }}
            />
            <FormControlLabel
              value="GROUP"
              control={
                <Radio
                  size="small"
                  sx={{ '&.Mui-checked': { color: '#6366f1' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" fontWeight={filterType === 'GROUP' ? 700 : 400}>Groups</Typography>
                  <Chip label={groupCount} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: filterType === 'GROUP' ? '#6366f115' : 'grey.100' }} />
                </Box>
              }
              sx={{ '& .MuiFormControlLabel-label': { ml: 0.5 } }}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Explicit Access Entries */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {filteredEntries.length > 0 ? (
          filteredEntries.map(entry => (
            <AccessEntryRow
              key={entry.id}
              entry={entry}
              canManage={canManageAccess}
              isAdmin={isAdmin}
              onRevoke={handleRevoke}
              onToggleType={handleToggleType}
              onChangeLevel={handleChangeLevel}
            />
          ))
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'grey.300' }}>
            <LockIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {filterType === 'ALL'
                ? 'No explicit access grants yet. Use the "Grant Access" button to add users or groups.'
                : `No ${filterType.toLowerCase()} access grants found.`
              }
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Inherited Access */}
      {accessData.inherited.length > 0 && (
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Inherited Access (read-only)
          </Typography>
          <Stack spacing={1}>
            {accessData.inherited.map((entry, idx) => (
              <InheritedAccessRow key={idx} entry={entry} />
            ))}
          </Stack>
        </Box>
      )}

      {/* ================================================================== */}
      {/* GRANT ACCESS DIALOG                                                 */}
      {/* ================================================================== */}
      <Dialog
        open={grantOpen}
        onClose={() => { setGrantOpen(false); setSelectedPrincipal(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'visible' },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PersonAddIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Grant Access</Typography>
              <Typography variant="caption" color="text.secondary">Add a user or group to this record</Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Principal Type Toggle */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Grant To
              </Typography>
              <RadioGroup
                row
                value={grantForm.principalType}
                onChange={(e) => {
                  setSelectedPrincipal(null);
                  setGrantForm({ ...grantForm, principalType: e.target.value });
                }}
              >
                <Paper
                  component={FormControlLabel}
                  value="USER"
                  control={
                    <Radio
                      size="small"
                      sx={{ '&.Mui-checked': { color: '#3b82f6' } }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>Individual User</Typography>
                    </Box>
                  }
                  elevation={0}
                  sx={{
                    flex: 1, m: 0, mr: 1, p: 1.5, pl: 1,
                    border: '2px solid',
                    borderColor: grantForm.principalType === 'USER' ? '#3b82f6' : 'grey.200',
                    borderRadius: 2,
                    bgcolor: grantForm.principalType === 'USER' ? '#3b82f608' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                />
                <Paper
                  component={FormControlLabel}
                  value="GROUP"
                  control={
                    <Radio
                      size="small"
                      sx={{ '&.Mui-checked': { color: '#6366f1' } }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <GroupIcon fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>Group / Dept</Typography>
                    </Box>
                  }
                  elevation={0}
                  sx={{
                    flex: 1, m: 0, p: 1.5, pl: 1,
                    border: '2px solid',
                    borderColor: grantForm.principalType === 'GROUP' ? '#6366f1' : 'grey.200',
                    borderRadius: 2,
                    bgcolor: grantForm.principalType === 'GROUP' ? '#6366f108' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                />
              </RadioGroup>
            </Box>

            {/* User/Group Search */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {grantForm.principalType === 'USER' ? 'Search User' : 'Search Group'}
              </Typography>
              <UserSearch
                type={grantForm.principalType as 'USER' | 'GROUP'}
                value={selectedPrincipal}
                onChange={(val: any) => setSelectedPrincipal(val)}
              />
            </Box>

            {/* Access Level */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Permission Level
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {ACCESS_LEVELS.map(level => (
                  <AccessLevelRadioCard
                    key={level.value}
                    level={level}
                    selected={grantForm.level === level.value}
                    onChange={() => setGrantForm({ ...grantForm, level: level.value })}
                  />
                ))}
              </Box>
            </Box>

            {/* Allow/Deny Switch */}
            {isAdmin && (
              <Box sx={{
                p: 2, borderRadius: 2,
                bgcolor: grantForm.accessType === 'DENY' ? 'error.50' : 'success.50',
                border: '1px solid',
                borderColor: grantForm.accessType === 'DENY' ? 'error.200' : 'success.200',
                transition: 'all 0.3s',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {grantForm.accessType === 'DENY' ? (
                      <BlockIcon color="error" />
                    ) : (
                      <CheckCircleIcon color="success" />
                    )}
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {grantForm.accessType === 'DENY' ? 'Deny Access' : 'Allow Access'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {grantForm.accessType === 'DENY'
                          ? 'Explicitly block this principal from accessing'
                          : 'Grant the selected permission level'
                        }
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={grantForm.accessType === 'ALLOW'}
                    onChange={() => setGrantForm({
                      ...grantForm,
                      accessType: grantForm.accessType === 'ALLOW' ? 'DENY' : 'ALLOW',
                    })}
                    color="success"
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        '&.Mui-checked': { color: '#10b981' },
                        '&.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b98180' },
                      },
                      '& .MuiSwitch-track': { bgcolor: '#ef444480' },
                    }}
                  />
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => { setGrantOpen(false); setSelectedPrincipal(null); }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGrant}
            disabled={!selectedPrincipal || grantLoading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              '&:hover': { background: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
            }}
          >
            {grantLoading ? <CircularProgress size={20} color="inherit" /> : 'Grant Access'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
