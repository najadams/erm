'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, Chip, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, Grid, Alert 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Lock as LockIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function LegalHoldsPage() {
  const router = useRouter();
  const [holds, setHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
      name: '',
      caseReference: '',
      description: '',
      ownerId: '', // Ideally current user or select list
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'ACTIVE',
      notificationRecipients: '',
      notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/governance/legal-holds');
        if (res.ok) {
            setHolds(await res.json());
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleOpen = () => {
      setEditId(null);
      setFormData({
          name: '', caseReference: '', description: '', ownerId: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '', status: 'ACTIVE', notificationRecipients: '', notes: ''
      });
      setOpen(true);
  };

  const handleEdit = (hold: any) => {
      setEditId(hold.id);
      setFormData({
          name: hold.name,
          caseReference: hold.caseReference || '',
          description: hold.description || '',
          ownerId: hold.ownerId || '',
          startDate: hold.startDate ? hold.startDate.split('T')[0] : '',
          endDate: hold.endDate ? hold.endDate.split('T')[0] : '',
          status: hold.status,
          notificationRecipients: hold.notificationRecipients || '',
          notes: hold.notes || ''
      });
      setOpen(true);
  };

  const handleSubmit = async () => {
      if (!formData.name || !formData.description) {
          setError('Name and Description are required');
          return;
      }

      try {
          const url = editId ? `/api/governance/legal-holds/${editId}` : '/api/governance/legal-holds';
          const method = editId ? 'PUT' : 'POST';
          
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });

          if (!res.ok) throw new Error('Failed to save hold');
          
          setOpen(false);
          fetchData();
      } catch (err: any) {
          setError(err.message);
      }
  };

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>Legal Holds</Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage active legal holds and litigation locks on records.
                </Typography>
            </Box>
            <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={handleOpen}>
                Create Legal Hold
            </Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
            <Table>
                <TableHead sx={{ bgcolor: '#fff4f4' }}> {/* Light red bg for legal context */}
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Case Name / Reference</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Owner</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Records Held</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
                    ) : holds.length === 0 ? (
                        <TableRow><TableCell colSpan={6} align="center">No active legal holds.</TableCell></TableRow>
                    ) : (
                        holds.map((hold) => (
                            <TableRow key={hold.id} hover>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">{hold.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{hold.caseReference}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        icon={hold.status === 'ACTIVE' ? <LockIcon /> : <CheckCircleIcon />} 
                                        label={hold.status} 
                                        color={hold.status === 'ACTIVE' ? 'error' : 'default'} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>{hold.owner?.name || '-'}</TableCell>
                                <TableCell>{new Date(hold.startDate).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Chip label={hold._count?.records || 0} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleEdit(hold)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Paper>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>
                {editId ? 'Edit Legal Hold' : 'Create New Legal Hold'}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 8 }}>
                            <TextField 
                                label="Case / Hold Name" fullWidth required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                            <TextField 
                                label="Case Reference ID" fullWidth 
                                value={formData.caseReference}
                                onChange={(e) => setFormData({...formData, caseReference: e.target.value})}
                            />
                        </Grid>
                    </Grid>

                    <TextField 
                        label="Description / Scope Summary" 
                        multiline rows={3} fullWidth required
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        helperText="Describe the scope of the hold (e.g. 'All emails from 2024 related to Project X')"
                    />

                    <Grid container spacing={2}>
                         <Grid size={{ xs: 6 }}>
                            <TextField 
                                label="Start Date" type="date" fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.startDate}
                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField 
                                label="Est. End Date" type="date" fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.endDate}
                                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            />
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                             <TextField 
                                select label="Status" fullWidth
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                             >
                                 <MenuItem value="ACTIVE">Active (Locked)</MenuItem>
                                 <MenuItem value="RELEASED">Released (Unlocked)</MenuItem>
                                 <MenuItem value="CLOSED">Closed (Archived)</MenuItem>
                             </TextField>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField 
                                label="Notification Recipients" fullWidth
                                placeholder="email@example.com, legal@example.com"
                                value={formData.notificationRecipients}
                                onChange={(e) => setFormData({...formData, notificationRecipients: e.target.value})}
                            />
                        </Grid>
                    </Grid>

                     <TextField 
                        label="Internal Notes" multiline rows={2} fullWidth
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="contained" color="error" onClick={handleSubmit}>
                    {editId ? 'Update Hold' : 'Create Hold'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
}
