'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';

import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import SecurityIcon from '@mui/icons-material/Security';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      setName((session.user as any).name || '');
    }
  }, [status, session, router]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to change password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <Box p={4}>Loading...</Box>;
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user as any;

  return (
    <React.Fragment>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
          Settings
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* Profile Information Section */}
        <Paper sx={{ p: 4, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Profile Information
            </Typography>
          </Box>
          
          <Stack spacing={3}>
            <TextField
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            
            <TextField
              label="Email"
              fullWidth
              value={user.email}
              disabled
              helperText="Email cannot be changed"
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                Role:
              </Typography>
              <Chip 
                label={user.role} 
                color={user.role === 'ADMIN' ? 'secondary' : user.role === 'AUDITOR' ? 'warning' : 'default'}
                size="small"
              />
            </Box>

            {user.createdAt && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Member since:
                </Typography>
                <Typography variant="body2">
                  {new Date(user.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            )}

            <Button 
              variant="contained" 
              onClick={handleUpdateProfile}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              Update Profile
            </Button>
          </Stack>
        </Paper>

        {/* Change Password Section */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SecurityIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Change Password
            </Typography>
          </Box>

          <Stack spacing={3}>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Must be at least 6 characters"
            />
            
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button 
              variant="contained" 
              color="warning"
              onClick={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              sx={{ alignSelf: 'flex-start' }}
            >
              Change Password
            </Button>
          </Stack>
        </Paper>

        {/* System Settings (Admin Only) */}
        {(user.role === 'ADMIN') && (
            <Paper sx={{ p: 4, borderRadius: 3, mt: 3, border: '1px solid #e2e8f0' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SecurityIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Admin Controls
                    </Typography>
                 </Box>
                 <SystemSettingsControl />
            </Paper>
        )}
    </React.Fragment>
  );
}

function SystemSettingsControl() {
    const [allowUploads, setAllowUploads] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/settings/system')
            .then(res => res.json())
            .then(data => {
                if (data.allowUserUploads !== undefined) setAllowUploads(data.allowUserUploads);
            })
            .catch(console.error);
    }, []);

    const handleToggle = async (val: boolean) => {
        setAllowUploads(val);
        setSaving(true);
        try {
            await fetch('/api/settings/system', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowUserUploads: val })
            });
        } catch(e) {
            console.error(e);
            alert('Failed to save settings');
            setAllowUploads(!val); // Revert
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack spacing={2}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Box>
                     <Typography fontWeight="bold">User Uploads</Typography>
                     <Typography variant="caption" color="text.secondary">
                        Allow non-admin users to upload records.
                     </Typography>
                 </Box>
                 <Switch 
                    checked={allowUploads}
                    onChange={(e) => handleToggle(e.target.checked)}
                    disabled={saving}
                 />
             </Box>
        </Stack>
    );
}
