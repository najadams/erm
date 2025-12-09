'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Link from 'next/link';

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({ name: '', email: '', reason: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" gutterBottom fontWeight="bold">
              Request Submitted!
            </Typography>
            <Typography color="text.secondary" paragraph>
              Your request has been sent to the administrators. You will be notified via email once approved.
            </Typography>
            <Link href="/login" passHref>
               <Button variant="outlined">Back to Login</Button>
            </Link>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 4, width: '100%', border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: '#1e293b' }}>
            Request Access
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Join the Enterprise Record Management System.
          </Typography>

          {status === 'error' && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField 
                label="Full Name" 
                required
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={status === 'loading'}
              />
              <TextField 
                label="Email Address" 
                type="email"
                required 
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={status === 'loading'}
              />
              <TextField 
                label="Reason for Access" 
                multiline
                rows={3}
                required 
                fullWidth
                placeholder="e.g. I am a new staff member in the finance department..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                disabled={status === 'loading'}
              />
              <Button 
                type="submit" 
                variant="contained" 
                size="large" 
                fullWidth 
                disabled={status === 'loading'}
                sx={{ py: 1.5, fontWeight: 'bold' }}
              >
                {status === 'loading' ? 'Submitting...' : 'Submit Request'}
              </Button>
            </Stack>
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link href="/login" style={{ textDecoration: 'none', color: '#3b82f6' }}>
              Already have an account? Sign In
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
