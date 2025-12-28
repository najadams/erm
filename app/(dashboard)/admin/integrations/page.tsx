'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Container, Paper, 
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import AddIcon from '@mui/icons-material/Add';
// Using Box instead of Grid to avoid type errors
import { Card, CardContent } from '@mui/material'; // Redundant but harmless for now

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchKeys = async () => {
      try {
          const res = await fetch('/api/admin/integrations');
          if (res.ok) setKeys(await res.json());
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
      fetchKeys();
  }, []);

  const handleCreateKey = async () => {
      if (!newKeyName) return;
      try {
          const res = await fetch('/api/admin/integrations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newKeyName })
          });
          if (res.ok) {
              const data = await res.json();
              setCreatedKey(data.rawKey);
              fetchKeys();
          }
      } catch (e) { alert('Error generating key'); }
  };

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
                    {keys.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center">No active API keys found.</TableCell></TableRow>
                    ) : (
                        keys.map((key) => (
                            <TableRow key={key.id}>
                                <TableCell sx={{ fontWeight: 'bold' }}>{key.name}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{key.prefix}</TableCell>
                                <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={key.isActive ? "Active" : "Revoked"} 
                                        color={key.isActive ? "success" : "default"} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button size="small" color="error">Revoke</Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Paper>

        {/* New Key Dialog */}
        <Dialog open={newKeyDialog} onClose={() => setNewKeyDialog(false)}>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogContent>
                {!createdKey ? (
                    <>
                        <DialogContentText sx={{ mb: 2 }}>
                            Enter a name for this key to identify its usage (e.g. "Zapier Integration").
                        </DialogContentText>
                        <TextField 
                            autoFocus margin="dense" label="Key Name" fullWidth variant="outlined" 
                            value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                        />
                    </>
                ) : (
                    <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                        <Typography color="success.main" fontWeight="bold" gutterBottom>Key Generated Successfully!</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Please copy this key now. You will not be able to see it again.
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'white', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {createdKey}
                        </Paper>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                {!createdKey ? (
                    <>
                        <Button onClick={() => setNewKeyDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateKey} variant="contained">Generate</Button>
                    </>
                ) : (
                    <Button onClick={() => { setNewKeyDialog(false); setCreatedKey(null); setNewKeyName(''); }} variant="contained">Done</Button>
                )}
            </DialogActions>
        </Dialog>

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
