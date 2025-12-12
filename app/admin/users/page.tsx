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
import Sidebar from '@/components/layout/Sidebar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';

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
  createdAt: string;
  groups?: Group[];
}

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabHtml, setTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ 
      id: '', 
      name: '', 
      email: '', 
      password: '', 
      role: 'USER', 
      groupIds: [] as string[] 
  });

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
    try {
      const [usersRes, reqsRes, groupsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/access-requests'),
          fetch('/api/groups')
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (reqsRes.ok) setRequests(await reqsRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
      setEditMode(false);
      setFormData({ id: '', name: '', email: '', password: '', role: 'USER', groupIds: [] });
      setOpenDialog(true);
  };

  const handleOpenEdit = (user: User) => {
      setEditMode(true);
      setFormData({
          id: user.id,
          name: user.name || '',
          email: user.email,
          password: '', // Don't show password
          role: user.role,
          groupIds: user.groups ? user.groups.map(g => g.id) : []
      });
      setOpenDialog(true);
  };

  const handleSubmit = async () => {
    const url = editMode ? '/api/users' : '/api/users'; // Both handle logic via method
    const method = editMode ? 'PATCH' : 'POST';
    
    // For PATCH, we send to the same endpoint but with PATCH method
    
    const res = await fetch('/api/users', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    if(res.ok) {
        setOpenDialog(false);
        fetchData();
    } else {
        alert('Operation failed');
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

  if (loading) return <Box p={4}>Loading...</Box>;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
           <Typography variant="h4" fontWeight="bold">User Management</Typography>
           <Button variant="contained" onClick={handleOpenCreate}>Create User</Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabHtml} onChange={(e, v) => setTab(v)}>
            <Tab label={`Users (${users.length})`} />
            <Tab label={`Access Requests (${requests.filter(r => r.status === 'PENDING').length})`} />
          </Tabs>
        </Box>

        {tabHtml === 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Groups</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                        <Chip label={user.role} color={user.role === 'ADMIN' ? 'secondary' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                        {user.groups?.map(g => (
                            <Chip key={g.id} label={g.name} size="small" variant="outlined" sx={{ mr: 0.5 }} />
                        ))}
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <Button size="small" onClick={() => handleOpenEdit(user)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Access Requests Tab Logic (Same as before) */}
        {tabHtml === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
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
                    <TableCell>
                        {req.status === 'PENDING' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="contained" color="success" onClick={() => handleApprove(req.id)}>Approve</Button>
                                <Button size="small" variant="outlined" color="error" onClick={() => handleReject(req.id)}>Reject</Button>
                            </Box>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Create/Edit User Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit User' : 'Create New User'}</DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Name" fullWidth value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <TextField label="Email" fullWidth value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={editMode} />
                {!editMode && (
                    <TextField label="Password" type="password" fullWidth value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                )}
                
                <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                        value={formData.role}
                        label="Role"
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                        <MenuItem value="USER">USER</MenuItem>
                        <MenuItem value="ADMIN">ADMIN</MenuItem>
                        <MenuItem value="AUDITOR">AUDITOR</MenuItem>
                        <MenuItem value="STAFF">STAFF</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth>
                    <InputLabel>Groups</InputLabel>
                    <Select
                        multiple
                        value={formData.groupIds}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFormData({...formData, groupIds: typeof val === 'string' ? val.split(',') : val})
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
                        {groups.map((group) => (
                            <MenuItem key={group.id} value={group.id}>
                            <Checkbox checked={formData.groupIds.indexOf(group.id) > -1} />
                            <ListItemText primary={group.name} secondary={group.type} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Button variant="contained" onClick={handleSubmit}>
                    {editMode ? 'Update User' : 'Create User'}
                </Button>
            </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
