'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  GridLegacy as Grid,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROJECT_TYPES = ['INVESTMENT', 'EXPANSION', 'INCENTIVE', 'COMPLIANCE', 'OTHER'];
const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VISIBILITY_OPTIONS = ['PRIVATE', 'ORG'];

export default function CreateProjectModal({ open, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'INVESTMENT',
    priority: 'MEDIUM',
    sector: '',
    registeredCompanyId: null as string | null,
    visibility: 'PRIVATE',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debounced search for companies
  useEffect(() => {
    // Initial fetch
    fetchCompanies('');
  }, []);

  const fetchCompanies = async (query: string) => {
    setLoadingCompanies(true);
    try {
      const res = await fetch(`/api/companies?q=${query}`);
      const data = await res.json();
      if (res.ok) {
        setCompanies(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
        setError('Project Name is required.');
        return;
    }
    if (!formData.registeredCompanyId) {
        setError('A Registered Company must be linked.');
        return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            // Format dates simply for now
            startDate: formData.startDate,
            endDate: formData.endDate
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create project');
      }

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'INVESTMENT',
        priority: 'MEDIUM',
        sector: '',
        registeredCompanyId: null,
        visibility: 'PRIVATE',
        startDate: null,
        endDate: null,
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                {error && (
                    <Grid item xs={12}>
                        <div className="text-red-500 mb-2">{error}</div>
                    </Grid>
                )}
                
                {/* Basic Info */}
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Project Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <Autocomplete
                        options={companies}
                        getOptionLabel={(option) => `${option.name} (${option.registrationNumber})`}
                        loading={loadingCompanies}
                        onInputChange={(event, newInputValue) => {
                            fetchCompanies(newInputValue);
                        }}
                        onChange={(event, newValue) => {
                            setFormData({ ...formData, registeredCompanyId: newValue ? newValue.id : null });
                        }}
                        renderInput={(params) => (
                            <TextField 
                                {...params} 
                                label="Link Company" 
                                required
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <React.Fragment>
                                            {loadingCompanies ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </Grid>

                {/* Governance */}
                <Grid item xs={12} md={4}>
                    <TextField
                        select
                        fullWidth
                        label="Type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                        {PROJECT_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs={12} md={4}>
                    <TextField
                        select
                        fullWidth
                        label="Priority"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                        {PROJECT_PRIORITIES.map((p) => (
                            <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                    </TextField>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        label="Sector"
                        value={formData.sector}
                        helperText="Primary sector (e.g. Agriculture)"
                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    />
                </Grid>

                {/* Timeline */}
                <Grid item xs={12} md={6}>
                     <DatePicker
                        label="Start Date"
                        value={formData.startDate}
                        onChange={(newValue) => setFormData({ ...formData, startDate: newValue })}
                        slotProps={{ textField: { fullWidth: true } }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                     <DatePicker
                        label="Estimated End Date"
                        value={formData.endDate}
                        onChange={(newValue) => setFormData({ ...formData, endDate: newValue })}
                        slotProps={{ textField: { fullWidth: true } }}
                    />
                </Grid>

                {/* Visibility */}
                 <Grid item xs={12} md={6}>
                    <TextField
                        select
                        fullWidth
                        label="Visibility"
                        value={formData.visibility}
                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    >
                        {VISIBILITY_OPTIONS.map((v) => (
                            <MenuItem key={v} value={v}>{v}</MenuItem>
                        ))}
                    </TextField>
                </Grid>

            </Grid>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Project'}
            </Button>
        </DialogActions>
        </Dialog>
    </LocalizationProvider>
  );
}
