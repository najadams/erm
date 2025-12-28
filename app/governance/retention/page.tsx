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
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';

export default function RetentionPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/governance/retention-policies')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) setPolicies(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Retention Schedules
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Define how long different types of records must be kept.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}>
            Create Policy
          </Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Policy Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Record Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Retention Period (Years)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
              ) : policies.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No retention policies found.</TableCell></TableRow>
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id} hover>
                    <TableCell fontWeight="500">{policy.name || '-'}</TableCell>
                    <TableCell>{policy.recordType?.name || 'All'}</TableCell>
                    <TableCell>{policy.durationYears} years</TableCell>
                    <TableCell sx={{ color: 'text.secondary', maxWidth: 300 }} noWrap>{policy.description}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
}
