'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f8fafc' }}>
      {/* Left Side - Branding */}
      <Box sx={{ 
        flex: 1, 
        bgcolor: '#0f172a', 
        display: { xs: 'none', md: 'flex' }, 
        flexDirection: 'column', 
        justifyContent: 'center', 
        p: 8, 
        color: 'white' 
      }}>
        <Typography variant="h3" fontWeight="bold" sx={{ mb: 2 }}>
          ERMS GIPC
        </Typography>
        <Typography variant="h5" color="rgba(255,255,255,0.7)" sx={{ mb: 6 }}>
          Secure Enterprise Record Management System
        </Typography>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
             <Typography variant="h4" fontWeight="bold" color="#38bdf8">10k+</Typography>
             <Typography variant="body2" color="rgba(255,255,255,0.6)">Documents Managed</Typography>
          </Box>
          <Box>
             <Typography variant="h4" fontWeight="bold" color="#38bdf8">99.9%</Typography>
             <Typography variant="body2" color="rgba(255,255,255,0.6)">System Uptime</Typography>
          </Box>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Container maxWidth="xs">
          <Paper elevation={0} sx={{ p: 4, width: '100%', border: '1px solid #e2e8f0', borderRadius: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: '#1e293b' }}>
              Welcome Back
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Please enter your details to sign in
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField 
                  label="Email Address" 
                  fullWidth 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <TextField 
                  label="Password" 
                  type="password"
                  fullWidth 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large" 
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </Box>
            
            <Typography variant="body2" align="center" sx={{ mt: 4, color: 'text.secondary' }}>
              Contact administrator if you forgot your password.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
