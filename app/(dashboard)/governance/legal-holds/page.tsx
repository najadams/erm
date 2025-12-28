'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Container, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import GavelIcon from '@mui/icons-material/Gavel';

export default function LegalHoldsPage() {
  const [holds, setHolds] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHolds = async () => {
      try {
          const res = await fetch('/api/governance/legal-holds');
          if (res.ok) {
              const data = await res.json();
              setHolds(data);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    fetchHolds();
  }, []);

  const handleCreate = async () => {
      if (!name) return;
      try {
          const res = await fetch('/api/governance/legal-holds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, description: desc })
          });
          if (res.ok) {
              setOpen(false);
              setName('');
              setDesc('');
              fetchHolds();
          } else {
              alert('Failed to create hold');
          }
      } catch (e) {
          alert('Error creating hold');
      }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Case Name', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => (
        <Chip label={params.value} color={params.value === 'ACTIVE' ? 'error' : 'default'} size="small" />
    )},
    { field: 'recordCount', headerName: 'Records Held', width: 150 },
    { field: 'createdAt', headerName: 'Created Date', width: 180, valueFormatter: (p:any) => new Date(p.value).toLocaleDateString() }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display:'flex', gap: 2, alignItems:'center' }}>
            <GavelIcon color="error" fontSize="large" />
            <Box>
                <Typography variant="h4" fontWeight="bold">Legal Holds</Typography>
                <Typography color="text.secondary">Manage verification freezes for ongoing litigation.</Typography>
            </Box>
        </Box>
        <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create New Hold
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
         <DataGrid
            rows={holds}
            columns={columns}
            loading={loading}
            sx={{ border: 0 }}
             slots={{
              noRowsOverlay: () => (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="text.secondary">No Active Legal Holds.</Typography>
                  </Box>
              )
          }}
         />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Initiate Legal Hold</DialogTitle>
        <DialogContent>
            <TextField 
                autoFocus margin="dense" label="Case Name / Hold Title" fullWidth variant="outlined" 
                value={name} onChange={e => setName(e.target.value)}
            />
            <TextField 
                margin="dense" label="Description / Notes" fullWidth multiline rows={3} variant="outlined" 
                value={desc} onChange={e => setDesc(e.target.value)}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained" color="error">Create Hold</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
