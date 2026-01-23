'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

import { DataGrid, GridColDef, GridRenderCellParams, GridToolbar } from '@mui/x-data-grid';

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  investorType: string;
  sector?: string;
  tin?: string;
  contactDetails?: string;
  _count?: {
      records: number;
  };
}

const INVESTOR_TYPES = [
    { value: 'FOREIGN', label: 'Foreign Investor' },
    { value: 'LOCAL', label: 'Local Investor' },
    { value: 'JOINT_VENTURE', label: 'Joint Venture' },
    { value: 'GOVERNMENT', label: 'Government/State' }
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
      name: '',
      registrationNumber: '',
      investorType: 'FOREIGN',
      sector: '',
      tin: '',
      contactDetails: ''
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpen = (company?: Company) => {
      if (company) {
          setEditingCompany(company);
          setFormData({
              name: company.name,
              registrationNumber: company.registrationNumber,
              investorType: company.investorType,
              sector: company.sector || '',
              tin: company.tin || '',
              contactDetails: company.contactDetails ? JSON.parse(company.contactDetails) : '' // Handle simple string vs JSON check? API stores it as JSON string but we treat it as string in form for now. Wait, schema says JSON or text? Schema says "String? // JSON or text". Let's assume text for simple integration or specialized Address object. Let's use simple Text Area.
          });
          // Fix: if contact details is actual json, parsing it might result in object.
          // Let's simplified check:
          let contact = company.contactDetails || '';
          try {
              const parsed = JSON.parse(contact);
              if (typeof parsed !== 'string') contact = JSON.stringify(parsed, null, 2);
              else contact = parsed;
          } catch(e) { } // it was string
          setFormData(prev => ({ ...prev, contactDetails: contact }));

      } else {
          setEditingCompany(null);
          setFormData({
              name: '',
              registrationNumber: '',
              investorType: 'FOREIGN',
              sector: '',
              tin: '',
              contactDetails: ''
          });
      }
      setOpen(true);
  };

  const handleClose = () => {
      setOpen(false);
      setEditingCompany(null);
      setError(null);
  };

  const handleSubmit = async () => {
      try {
          const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies';
          const method = editingCompany ? 'PUT' : 'POST';
          
          const payload = {
              ...formData,
              // contactDetails: formData.contactDetails // Send as string, API handles plain string? 
              // API POST does: contactDetails: contactDetails ? JSON.stringify(contactDetails) : undefined
              // If we send a string, JSON.stringify("foo") -> "\"foo\"". 
              // We should probably send the raw string if we want it to be just text, OR parsed object.
              // Let's send it as is, and let API decide or wrap. 
              // Actually, looking at my API implementation: "contactDetails: contactDetails ? JSON.stringify(contactDetails) : undefined"
              // If I send a string "123 Main St", it saves "\"123 Main St\"". That's fine.
          };

          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Operation failed');
          }

          handleClose();
          fetchCompanies();
      } catch (err: any) {
          alert(err.message);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this company?')) return;
      try {
          const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Delete failed');
          }
          fetchCompanies();
      } catch (err: any) {
          alert(err.message);
      }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Company Name', flex: 1, minWidth: 200 },
    { field: 'registrationNumber', headerName: 'Reg. Number', width: 150 },
    { 
        field: 'investorType', 
        headerName: 'Type', 
        width: 150,
        renderCell: (params) => (
            <Chip 
                label={params.value} 
                size="small" 
                color={params.value === 'FOREIGN' ? 'primary' : 'default'} 
                variant="outlined"
            />
        )
    },
    { field: 'sector', headerName: 'Sector', width: 130 },
    { field: 'tin', headerName: 'TIN', width: 130 },
    { 
        field: 'records', 
        headerName: 'Records', 
        width: 100,
        valueGetter: (value: any, row: Company) => row._count?.records || 0
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Registered Companies
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Company
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={companies}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
             toolbar: {
                 showQuickFilter: true,
             },
          }}
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editingCompany ? 'Edit Company' : 'Add Registered Company'}</DialogTitle>
          <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                  <TextField 
                      label="Company Name" 
                      fullWidth 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                  <TextField 
                      label="Registration Number" 
                      fullWidth 
                      required 
                      value={formData.registrationNumber}
                      onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                  />
                  <TextField 
                      label="Investor Type" 
                      select 
                      fullWidth 
                      required 
                      value={formData.investorType}
                      onChange={e => setFormData({...formData, investorType: e.target.value})}
                  >
                      {INVESTOR_TYPES.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                  </TextField>
                  <TextField 
                      label="Sector (Optional)" 
                      fullWidth 
                      value={formData.sector}
                      onChange={e => setFormData({...formData, sector: e.target.value})}
                  />
                  <TextField 
                      label="TIN (Tax ID)" 
                      fullWidth 
                      value={formData.tin}
                      onChange={e => setFormData({...formData, tin: e.target.value})}
                  />
                  <TextField 
                      label="Contact Details / Address" 
                      fullWidth 
                      multiline
                      rows={3}
                      value={formData.contactDetails}
                      onChange={e => setFormData({...formData, contactDetails: e.target.value})}
                      helperText="Enter address or contact info (saved as text)"
                  />
              </Box>
          </DialogContent>
          <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} variant="contained">Save</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
}
