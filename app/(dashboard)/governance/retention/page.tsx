'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { useRouter } from 'next/navigation';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import OutlinedInput from '@mui/material/OutlinedInput';
import ListItemText from '@mui/material/ListItemText';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';

export default function RetentionPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<any[]>([]);
  const [recordTypes, setRecordTypes] = useState<any[]>([]); // Categories with nested Types
  const [flatRecordTypes, setFlatRecordTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
  const [formData, setFormData] = useState({
      name: '',
      description: '',
      durationValue: 7,
      durationUnit: 'YEARS',
      trigger: 'CREATION_DATE',
      dispositionAction: 'DESTROY',
      preventDeletion: true,
      status: 'ACTIVE',
      recordTypeIds: [] as string[]
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [policiesRes, typesRes] = await Promise.all([
            fetch('/api/governance/retention-policies'),
            fetch('/api/record-types')
        ]);
        
        if (policiesRes.ok) setPolicies(await policiesRes.json());
        if (typesRes.ok) {
            const categories = await typesRes.json();
            setRecordTypes(categories);
            // Flatten types for easier selection
            const flat: any[] = [];
            categories.forEach((cat: any) => {
                if(cat.recordTypes) flat.push(...cat.recordTypes);
            });
            setFlatRecordTypes(flat);
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
          name: '', description: '', durationValue: 7, durationUnit: 'YEARS',
          trigger: 'CREATION_DATE', dispositionAction: 'DESTROY',
          preventDeletion: true, status: 'ACTIVE', recordTypeIds: []
      });
      setError(null);
      setOpen(true);
  };

  const handleEdit = (policy: any) => {
      setEditId(policy.id);
      setFormData({
          name: policy.name,
          description: policy.description || '',
          durationValue: policy.durationValue,
          durationUnit: policy.durationUnit,
          trigger: policy.trigger,
          dispositionAction: policy.dispositionAction,
          preventDeletion: policy.preventDeletion,
          status: policy.status,
          recordTypeIds: policy.recordTypes ? policy.recordTypes.map((rt: any) => rt.id) : []
      });
      setError(null);
      setOpen(true);
  };

  const handleDeleteClick = (id: string) => {
      setDeleteConfirmation({ open: true, id });
  };

  const handleConfirmDelete = async () => {
      if (!deleteConfirmation.id) return;
      
      try {
        const res = await fetch(`/api/governance/retention-policies/${deleteConfirmation.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        setDeleteConfirmation({ open: false, id: null });
        fetchData();
      } catch (err: any) {
          alert('Error deleting policy: ' + err.message);
          setDeleteConfirmation({ open: false, id: null });
      }
  };

  const handleClose = () => {
      setOpen(false);
  };

  const handleSubmit = async () => {
      if (!formData.name || formData.durationValue === undefined) {
          setError('Name and Duration are required');
          return;
      }

      try {
          const url = editId 
            ? `/api/governance/retention-policies/${editId}` 
            : '/api/governance/retention-policies';
            
          const method = editId ? 'PUT' : 'POST';

          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to save policy');
          }

          setOpen(false);
          fetchData();
      } catch (err: any) {
          setError(err.message);
      }
  };

  const getRecordTypeNames = (ids: string[]) => {
      return ids.map(id => flatRecordTypes.find(t => t.id === id)?.name || id).join(', ');
  };

  return (
      <React.Fragment>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Retention Schedules
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Define how long different types of records must be kept.
            </Typography>
          </Box>
          {policies.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                      No Retention Policies Yet. Create a policy to define rules.
                  </Typography>
              </Box>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            Create Policy
          </Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Policy Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Record Types</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Retention Period</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trigger</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Disposition</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
              ) : policies.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No retention policies found.</TableCell></TableRow>
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                        {policy.name || '-'}
                        {policy.status !== 'ACTIVE' && (
                            <Chip label={policy.status} size="small" sx={{ ml: 1 }} color={policy.status === 'DRAFT' ? 'default' : 'error'} />
                        )}
                    </TableCell>
                    <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {policy.recordTypes && policy.recordTypes.length > 0 ? (
                                policy.recordTypes.map((rt: any) => (
                                    <Chip key={rt.id} label={rt.name} size="small" variant="outlined" />
                                ))
                            ) : (
                                <Typography variant="caption" color="text.secondary">All / None</Typography>
                            )}
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Chip label={`${policy.durationValue} ${policy.durationUnit}`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{policy.trigger}</TableCell>
                    <TableCell>{policy.dispositionAction}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEdit(policy)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(policy.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editId ? 'Edit Retention Policy' : 'Create Retention Policy'}</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    
                    <TextField 
                        label="Policy Name" 
                        fullWidth 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Financial Records - 7 Years"
                    />

                    <FormControl fullWidth>
                        <InputLabel>Record Types (Category)</InputLabel>
                        <Select
                            multiple
                            value={formData.recordTypeIds}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData({...formData, recordTypeIds: typeof val === 'string' ? val.split(',') : val})
                            }}
                            input={<OutlinedInput label="Record Types (Category)" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => {
                                        const t = flatRecordTypes.find(type => type.id === value);
                                        return <Chip key={value} label={t ? t.name : value} size="small" />;
                                    })}
                                </Box>
                            )}
                        >
                            {flatRecordTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    <Checkbox checked={formData.recordTypeIds.indexOf(type.id) > -1} />
                                    <ListItemText primary={type.name} secondary={type.code} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label="Retention Period" 
                            type="number"
                            fullWidth 
                            required
                            value={formData.durationValue}
                            onChange={(e) => setFormData({...formData, durationValue: parseInt(e.target.value) || 0})}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Unit</InputLabel>
                            <Select
                                value={formData.durationUnit}
                                label="Unit"
                                onChange={(e) => setFormData({...formData, durationUnit: e.target.value})}
                            >
                                <MenuItem value="YEARS">Years</MenuItem>
                                <MenuItem value="MONTHS">Months</MenuItem>
                                <MenuItem value="DAYS">Days</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                         <FormControl fullWidth>
                            <InputLabel>Trigger Event</InputLabel>
                            <Select
                                value={formData.trigger}
                                label="Trigger Event"
                                onChange={(e) => setFormData({...formData, trigger: e.target.value})}
                            >
                                <MenuItem value="CREATION_DATE">Record Creation Date</MenuItem>
                                <MenuItem value="EVENT_BASED">Event Based</MenuItem>
                                <MenuItem value="CONTRACT_END">End of Contract</MenuItem>
                                <MenuItem value="FISCAL_YEAR_END">Fiscal Year End</MenuItem>
                            </Select>
                        </FormControl>
                         <FormControl fullWidth>
                            <InputLabel>Final Disposition</InputLabel>
                            <Select
                                value={formData.dispositionAction}
                                label="Final Disposition"
                                onChange={(e) => setFormData({...formData, dispositionAction: e.target.value})}
                            >
                                <MenuItem value="DESTROY">Destroy / Delete</MenuItem>
                                <MenuItem value="REVIEW">Review Required</MenuItem>
                                <MenuItem value="ARCHIVE">Permanent Archive</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <FormControlLabel 
                        control={
                            <Checkbox 
                                checked={formData.preventDeletion} 
                                onChange={(e) => setFormData({...formData, preventDeletion: e.target.checked})} 
                            />
                        } 
                        label="Prevent deletion if record is on Legal Hold (Auto-Hold)" 
                    />

                     <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            label="Status"
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                        >
                            <MenuItem value="ACTIVE">Active</MenuItem>
                            <MenuItem value="DRAFT">Draft</MenuItem>
                            <MenuItem value="DEPRECATED">Deprecated</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField 
                        label="Description / Legal Basis" 
                        multiline
                        rows={2}
                        fullWidth 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="e.g. Required under Data Protection Act..."
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>{editId ? 'Save Changes' : 'Create Policy'}</Button>
            </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
         <Dialog open={deleteConfirmation.open} onClose={() => setDeleteConfirmation({ open: false, id: null })} maxWidth="xs" fullWidth>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
                <Typography>
                    Are you sure you want to delete this retention policy?
                    This action cannot be undone and will remove the policy from all linked records.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteConfirmation({ open: false, id: null })}>Cancel</Button>
                <Button variant="contained" color="error" onClick={handleConfirmDelete}>Delete Policy</Button>
            </DialogActions>
        </Dialog>
      </React.Fragment>
  );
}
