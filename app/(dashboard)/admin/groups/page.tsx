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
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';

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
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import PeopleIcon from '@mui/icons-material/People';
import LockIcon from '@mui/icons-material/Lock';

// Group types - SYSTEM is display only, cannot be created
const GROUP_TYPES = [
  { value: 'DEPARTMENT', label: 'Department', description: 'Linked to organizational departments' },
  { value: 'TEAM', label: 'Team', description: 'Cross-functional teams' },
  { value: 'PROJECT', label: 'Project', description: 'Project-based access groups' },
];

const ALL_GROUP_TYPES = [...GROUP_TYPES, { value: 'SYSTEM', label: 'System', description: 'System-managed groups (read-only)' }];

interface User {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
  users?: User[];
  _count: { users: number };
  createdAt: string;
  updatedAt?: string;
}

interface FormData {
  id: string;
  name: string;
  type: string;
  userIds: string[];
}

const initialFormData: FormData = {
  id: '',
  name: '',
  type: 'DEPARTMENT',
  userIds: []
};

export default function AdminGroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formError, setFormError] = useState('');

  // View Members Dialog
  const [viewMembersDialog, setViewMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Delete Confirmation
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

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
      const [groupsRes, usersRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/users')
      ]);

      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (usersRes.ok) setAllUsers(await usersRes.json());
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const group = await res.json();
        setSelectedGroup(group);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setFormData(initialFormData);
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEdit = async (group: Group) => {
    setEditMode(true);
    setFormError('');

    // Fetch full group details with members
    try {
      const res = await fetch(`/api/groups/${group.id}`);
      if (res.ok) {
        const fullGroup = await res.json();
        setFormData({
          id: fullGroup.id,
          name: fullGroup.name,
          type: fullGroup.type,
          userIds: fullGroup.users?.map((u: User) => u.id) || []
        });
        setOpenDialog(true);
      }
    } catch (err) {
      setError('Failed to load group details');
    }
  };

  const handleViewMembers = async (group: Group) => {
    setSelectedGroup(group);
    setViewMembersDialog(true);
    await fetchGroupDetails(group.id);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Group name is required');
      return;
    }

    const method = editMode ? 'PUT' : 'POST';
    const url = editMode ? `/api/groups/${formData.id}` : '/api/groups';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          userIds: formData.userIds
        })
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

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    try {
      const res = await fetch(`/api/groups/${groupToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteDialog(false);
        setGroupToDelete(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete group');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'error';
      case 'DEPARTMENT': return 'primary';
      case 'PROJECT': return 'success';
      case 'TEAM': return 'info';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'SYSTEM') return <LockIcon fontSize="small" />;
    return null;
  };

  if (loading) return <Box p={4}>Loading...</Box>;

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Group Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage access groups for records and projects
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Create Group
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Members</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon color="action" fontSize="small" />
                    <Typography variant="body2" fontWeight="medium">{group.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={group.type}
                    color={getTypeColor(group.type) as any}
                    size="small"
                    icon={getTypeIcon(group.type) || undefined}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={group._count?.users || 0}
                    size="small"
                    variant="outlined"
                    onClick={() => handleViewMembers(group)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View Members">
                    <IconButton size="small" onClick={() => handleViewMembers(group)}>
                      <PeopleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {group.type !== 'SYSTEM' && (
                    <>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEdit(group)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(group)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {group.type === 'SYSTEM' && (
                    <Tooltip title="System groups cannot be modified">
                      <span>
                        <IconButton size="small" disabled>
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Box sx={{ py: 4 }}>
                    <GroupIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No groups found</Typography>
                    <Button variant="text" onClick={handleOpenCreate} sx={{ mt: 1 }}>
                      Create your first group
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Group Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Group' : 'Create New Group'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Group Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Finance Team, Project Alpha"
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={editMode} // Cannot change type after creation
              >
                {GROUP_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <ListItemText primary={type.label} secondary={type.description} />
                  </MenuItem>
                ))}
              </Select>
              {editMode && <FormHelperText>Type cannot be changed after creation</FormHelperText>}
            </FormControl>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Group Members
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Select Members</InputLabel>
              <Select
                multiple
                value={formData.userIds}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, userIds: typeof val === 'string' ? val.split(',') : val });
                }}
                input={<OutlinedInput label="Select Members" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const u = allUsers.find(user => user.id === value);
                      return <Chip key={value} label={u ? u.name || u.email : value} size="small" />;
                    })}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: { style: { maxHeight: 300 } }
                }}
              >
                {allUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Checkbox checked={formData.userIds.indexOf(user.id) > -1} />
                    <ListItemText
                      primary={user.name || 'Unnamed'}
                      secondary={user.email}
                    />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {formData.userIds.length} member{formData.userIds.length !== 1 ? 's' : ''} selected
              </FormHelperText>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Update Group' : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog
        open={viewMembersDialog}
        onClose={() => setViewMembersDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon />
            {selectedGroup?.name} Members
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingMembers ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Loading members...</Typography>
            </Box>
          ) : selectedGroup?.users && selectedGroup.users.length > 0 ? (
            <List dense>
              {selectedGroup.users.map((user) => (
                <ListItem key={user.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                      {(user.name || user.email)[0].toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name || 'Unnamed'}
                    secondary={user.email}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No members in this group</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedGroup?.type !== 'SYSTEM' && (
            <Button onClick={() => {
              setViewMembersDialog(false);
              if (selectedGroup) handleOpenEdit(selectedGroup);
            }}>
              Edit Members
            </Button>
          )}
          <Button onClick={() => setViewMembersDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the group <strong>{groupToDelete?.name}</strong>?
          </Typography>
          {(groupToDelete?._count?.users || 0) > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This group has {groupToDelete?._count?.users} member(s). They will be removed from this group.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. Any access permissions based on this group will be revoked.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete Group
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
