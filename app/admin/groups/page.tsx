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

interface Group {
  id: string;
  name: string;
  type: string;
  _count: { users: number };
  createdAt: string;
}

const GROUP_TYPES = ['DEPARTMENT', 'TEAM', 'PROJECT'];

export default function AdminGroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // New Group Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', type: 'DEPARTMENT' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
       // Ideally verify permissions via API or role check
       if ((session?.user as any).role !== 'ADMIN') {
          // Strict check for now, can be relaxed if we use hasPermission in client later
          router.push('/');
       } else {
          fetchData();
       }
    }
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) setGroups(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
    });
    if(res.ok) {
        setOpenDialog(false);
        setNewGroup({ name: '', type: 'DEPARTMENT' });
        fetchData();
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
           <Typography variant="h4" fontWeight="bold">Group Management</Typography>
           <Button variant="contained" onClick={() => setOpenDialog(true)}>Create Group</Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>
                      <Chip label={group.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{group._count.users}</TableCell>
                  <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {groups.length === 0 && !loading && (
                 <TableRow>
                     <TableCell colSpan={4} align="center">No groups found.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create Group Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
                <TextField label="Group Name" fullWidth value={newGroup.name} onChange={(e) => setNewGroup({...newGroup, name: e.target.value})} />
                <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={newGroup.type}
                        label="Type"
                        onChange={(e) => setNewGroup({...newGroup, type: e.target.value})}
                    >
                        {GROUP_TYPES.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button variant="contained" onClick={handleCreateGroup}>Create</Button>
            </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
