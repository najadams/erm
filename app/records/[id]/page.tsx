'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack'; // Using Stack for layout
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

// Mock data removed

export default function RecordDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [record, setRecord] = React.useState<any>(null); // Use proper type if possible, using any for quick MVP iteration with optional fields
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
        fetch(`/api/records/${id}`)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
        })
        .then(data => {
            // Transform tags if string
            if (typeof data.tags === 'string' && data.tags.length > 0) {
                // If it's a comma separated string
                data.tags = data.tags.split(',').map((t: string) => t.trim());
            } else if (!Array.isArray(data.tags)) {
                data.tags = [];
            }
            setRecord(data);
        })
        .catch(() => setRecord(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this record?')) {
        await fetch(`/api/records/${id}`, { method: 'DELETE' });
        router.push('/');
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>;
  if (!record) return <Box sx={{ p: 4, textAlign: 'center' }}>Record not found.</Box>;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />

      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => router.back()}
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            Back to Dashboard
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight="bold">
                  {record.title}
                </Typography>
                <Chip 
                  label={record.status} 
                  color="success" 
                  variant="outlined" 
                  size="small" 
                  icon={<CheckCircleIcon />}
                  sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}
                />
              </Box>
              <Typography color="text.secondary">
                Uploaded by <strong style={{ color: '#0f172a' }}>{record.user?.name || 'Unknown'}</strong> on {new Date(record.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<EditIcon />}>
                Edit Metadata
              </Button>
              <Button 
                  variant="contained" 
                  color="secondary" 
                  startIcon={<DownloadIcon />}
                  href={record.fileUrl}
                  target="_blank"
                >
                Download
              </Button>
            </Box>
          </Box>
        </Box>

        {/* content layout using Stack instead of Grid for safety */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4}>
          
          {/* Main Preview Area */}
          <Box sx={{ flex: 2 }}>
            <Paper sx={{ p: 4, minHeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9', border: '2px dashed #cbd5e1' }}>
              <Typography variant="h6" color="text.secondary" fontWeight="bold">
                Document Preview
              </Typography>
              <Typography color="text.secondary">
                {record.fileType}
              </Typography>
              <Button sx={{ mt: 2 }} href={record.fileUrl} target="_blank">
                Open in new tab
              </Button>
            </Paper>
          </Box>

          {/* Sidebar Metadata */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                Metadata
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">CATEGORY</Typography>
                  <Typography fontWeight="500">{record.category}</Typography>
                </Box>
                
                <Box>
                   <Typography variant="caption" color="text.secondary" fontWeight="bold">DESCRIPTION</Typography>
                   <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{record.description || 'No description'}</Typography>
                </Box>

                <Box>
                   <Typography variant="caption" color="text.secondary" fontWeight="bold">TAGS</Typography>
                   <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                     {Array.isArray(record.tags) && record.tags.map((tag: string) => (
                       <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'secondary.light', color: 'white', fontWeight: 600 }} />
                     ))}
                   </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">FILE INFO</Typography>
                  <Typography variant="body2">{record.fileType.toUpperCase()}</Typography>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
               <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button variant="outlined" color="primary" fullWidth>Request Verification</Button>
                <Button variant="outlined" color="error" fullWidth onClick={handleDelete}>Delete Record</Button>
              </Box>
            </Paper>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
