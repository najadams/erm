'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Container, Paper, 
  Table, TableBody, TableCell, TableHead, TableRow, Chip 
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import AddIcon from '@mui/icons-material/Add';
// Using Box instead of Grid to avoid type errors
import { Card, CardContent } from '@mui/material';

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<any[]>([]);

  // Mock Data for now
  useEffect(() => {
      setKeys([
          { id: '1', name: 'Zapier Ingestion', prefix: 'sk_live_...', createdAt: new Date() },
          { id: '2', name: 'Legacy ERP Sync', prefix: 'sk_test_...', createdAt: new Date() }
      ]);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ExtensionIcon fontSize="large" color="action" />
                <Box>
                    <Typography variant="h4" fontWeight="bold">Integrations</Typography>
                    <Typography color="text.secondary">Manage API Keys and Webhooks.</Typography>
                </Box>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />}>Generate New Key</Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden', mb: 4 }}>
            <Typography variant="h6" sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                Active API Keys
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Key Prefix</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {keys.map((key) => (
                        <TableRow key={key.id}>
                            <TableCell sx={{ fontWeight: 'bold' }}>{key.name}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{key.prefix}</TableCell>
                            <TableCell>{key.createdAt.toLocaleDateString()}</TableCell>
                            <TableCell><Chip label="Active" color="success" size="small" /></TableCell>
                            <TableCell>
                                <Button size="small" color="error">Revoke</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>

        <Box sx={{ p: 4, border: '1px dashed #cbd5e1', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="text.secondary">Webhook Configuration</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
                Configure outbound event streams (e.g. RECORD_DISPOSED, HOLD_RELEASED).
            </Typography>
            <Button variant="outlined" disabled>Coming Soon</Button>
        </Box>
    </Container>
  );
}
