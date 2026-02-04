'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import FormHelperText from '@mui/material/FormHelperText';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Switch from '@mui/material/Switch';

// Role definitions matching lib/permissions.ts
const ROLES = [
  { value: 'EXTERNAL_USER', label: 'External User', description: 'Submit only, no browsing' },
  { value: 'USER', label: 'User', description: 'Basic workspace access' },
  { value: 'CONTRIBUTOR', label: 'Contributor', description: 'Content creation and submission' },
  { value: 'APPROVER', label: 'Approver', description: 'Department-level verification' },
  { value: 'RECORDS_OFFICER', label: 'Records Officer', description: 'Organization-wide governance' },
  { value: 'ADMIN', label: 'Admin', description: 'System administration' },
  { value: 'AUDITOR', label: 'Auditor', description: 'Read-only compliance oversight' },
];

// Clearance levels matching lib/permissions.ts CLEARANCE_LEVELS
const CLEARANCE_LEVELS = [
  { value: 1, label: 'Level 1 - Public', description: 'Access to public documents only' },
  { value: 2, label: 'Level 2 - Official', description: 'Access to official internal documents' },
  { value: 3, label: 'Level 3 - Official Confidential', description: 'Access to confidential documents' },
  { value: 4, label: 'Level 4 - Restricted', description: 'Access to restricted documents' },
  { value: 5, label: 'Level 5 - Secret', description: 'Access to secret/classified documents' },
];

interface Department {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  clearanceLevel: number;
  departmentId?: string;
  department?: Department;
  accountExpiresAt?: string;
  isActive: boolean;
  groups?: Group[];
  createdAt: string;
  _count?: { records: number; ownedProjects: number };
}

interface AccountRequest {
  id: string;
  name: string;
  email: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface FormData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  clearanceLevel: number;
  departmentId: string;
  accountExpiresAt: string;
  groupIds: string[];
}

const initialFormData: FormData = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'USER',
  clearanceLevel: 1,
  departmentId: '',
  accountExpiresAt: '',
  groupIds: []
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formError, setFormError] = useState('');

  // Delete Confirmation
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if ((session?.user as any).role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchData();
      }
    }
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, reqsRes, groupsRes, deptsRes] = await Promise.all([
        fetch('/api/users?admin=true'),
        fetch('/api/access-requests'),
        fetch('/api/groups'),
        fetch('/api/departments')
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (reqsRes.ok) setRequests(await reqsRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (deptsRes.ok) setDepartments(await deptsRes.json());
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setFormData(initialFormData);
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditMode(true);
    setFormData({
      id: user.id,
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role,
      clearanceLevel: user.clearanceLevel || 1,
      departmentId: user.departmentId || '',
      accountExpiresAt: user.accountExpiresAt ? user.accountExpiresAt.split('T')[0] : '',
      groupIds: user.groups ? user.groups.map(g => g.id) : []
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');

    // Validation
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!editMode && !formData.email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!editMode && !formData.password) {
      setFormError('Password is required for new users');
      return;
    }

    const method = editMode ? 'PATCH' : 'POST';
    const payload = editMode
      ? {
          id: formData.id,
          name: formData.name,
          role: formData.role,
          clearanceLevel: formData.clearanceLevel,
          departmentId: formData.departmentId || null,
          accountExpiresAt: formData.accountExpiresAt || null,
          groupIds: formData.groupIds,
          password: formData.password ? formData.password : undefined
        }
      : formData;

    try {
      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        handleCloseDialog();
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Operation failed');
      }
    } catch (err) {
      setFormError('Network error');
    }
  };

  const handleToggleStatus = async (user: User) => {
    // Direct toggle without confirmation for better UX on switches, 
    // or we could use a custom dialog. For now, removing native confirm to fix browser test blocking
    // and provide smoother toggle experience.
    try {
      const res = await fetch(`/api/users?id=${user.id}&reactivate=${!user.isActive}`, { 
          method: 'DELETE' 
      });
      
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to update user status');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  // Deprecated mostly, but keeping for compatibility if generic delete needed
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialog(true);
  };

  // Not strictly used if we rely on handleToggleStatus, but good to keep for "hard delete" logic if ever needed
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    // We can just call handleToggleStatus effectively if we want to channel it there, 
    // but the DELETE endpoint now handles toggling if `reactivate` param is present, 
    // or standard delete if not. 
    // HOWEVER, the logic requested was to "deactivate" instead of delete.
    // So let's route this to toggle status.
    
    // Actually, let's keep this as a "Deactivate" confirmation flow
    try {
        const res = await fetch(`/api/users?id=${userToDelete.id}&reactivate=false`, { method: 'DELETE' });
        if (res.ok) {
            setDeleteDialog(false);
            setUserToDelete(null);
            fetchData();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to deactivate user');
        }
    } catch(err) {
        alert('Network error');
    }
  };

  const handleApprove = async (id: string) => {
    await fetch(`/api/access-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/access-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' })
    });
    fetchData();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'RECORDS_OFFICER': return 'warning';
      case 'AUDITOR': return 'info';
      case 'APPROVER': return 'secondary';
      case 'CONTRIBUTOR': return 'success';
      default: return 'default';
    }
  };

  const getClearanceColor = (level: number) => {
    if (level >= 5) return 'error';
    if (level >= 4) return 'warning';
    if (level >= 3) return 'info';
    return 'default';
  };

  if (loading) return <Box p={4}>Loading...</Box>;

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">User Management</Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleOpenCreate}>
          Create User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label={`Users (${users.length})`} />
          <Tab label={`Account Requests (${requests.filter(r => r.status === 'PENDING').length})`} />
        </Tabs>
      </Box>

      {/* Users Tab */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Clearance</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Groups</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover sx={{ opacity: user.isActive ? 1 : 0.6 }}>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                        label={user.isActive ? 'Active' : 'Inactive'} 
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                        variant={user.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`L${user.clearanceLevel || 1}`}
                      color={getClearanceColor(user.clearanceLevel || 1) as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {user.department?.name || user.groups?.find(g => g.type === 'DEPARTMENT')?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {user.groups?.filter(g => g.type !== 'DEPARTMENT').slice(0, 2).map(g => (
                        <Chip key={g.id} label={g.name} size="small" variant="outlined" />
                      ))}
                      {(user.groups?.filter(g => g.type !== 'DEPARTMENT').length || 0) > 2 && (
                          <Chip label={`+${(user.groups?.filter(g => g.type !== 'DEPARTMENT').length || 0) - 2}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                      <Switch
                          checked={user.isActive}
                          onChange={() => handleToggleStatus(user)}
                          color="success"
                          size="small"
                      />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Account Requests Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.name}</TableCell>
                  <TableCell>{req.email}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{req.reason}</TableCell>
                  <TableCell>
                    <Chip
                      label={req.status}
                      color={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {req.status === 'PENDING' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained" color="success" onClick={() => handleApprove(req.id)}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleReject(req.id)}>
                          Reject
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No account requests</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit User' : 'Create New User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Full Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={editMode}
              helperText={editMode ? 'Email cannot be changed' : ''}
            />

            {!editMode ? (
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Minimum 8 characters recommended"
              />
            ) : (
                <TextField
                label="New Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Leave blank to keep current password"
              />
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(role => (
                    <MenuItem key={role.value} value={role.value}>
                      <ListItemText primary={role.label} secondary={role.description} />
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Determines user permissions</FormHelperText>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Clearance Level</InputLabel>
                <Select
                  value={formData.clearanceLevel}
                  label="Clearance Level"
                  onChange={(e) => setFormData({ ...formData, clearanceLevel: Number(e.target.value) })}
                >
                  {CLEARANCE_LEVELS.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      <ListItemText primary={level.label} secondary={level.description} />
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Document access level</FormHelperText>
              </FormControl>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={formData.departmentId}
                label="Department"
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              >
                <MenuItem value="">
                  <em>No Department</em>
                </MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                ))}
              </Select>
              <FormHelperText>Assign user to a department for scoped access</FormHelperText>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Groups</InputLabel>
              <Select
                multiple
                value={formData.groupIds}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, groupIds: typeof val === 'string' ? val.split(',') : val });
                }}
                input={<OutlinedInput label="Groups" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const g = groups.find(grp => grp.id === value);
                      return <Chip key={value} label={g ? g.name : value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {groups
                  .filter(group => group.type !== 'DEPARTMENT')
                  .map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Checkbox checked={formData.groupIds.indexOf(group.id) > -1} />
                    <ListItemText primary={group.name} secondary={group.type} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Additional group memberships</FormHelperText>
            </FormControl>

            <TextField
              label="Account Expiry Date"
              type="date"
              fullWidth
              value={formData.accountExpiresAt}
              onChange={(e) => setFormData({ ...formData, accountExpiresAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Leave blank for no expiry (permanent account)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
      
    </React.Fragment>
  );
}
