'use client';

import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, Chip, CircularProgress, Button } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRouter } from 'next/navigation';
import { differenceInDays } from 'date-fns';

export default function ProjectsAtRisk() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (res.ok) {
        // Filter for "At Risk": In Review for > 3 days
        const atRisk = data.filter((p: any) => {
            const isReview = ['SUBMITTED', 'IN_REVIEW'].includes(p.status);
            if (!isReview) return false;
            
            const daysSinceUpdate = differenceInDays(new Date(), new Date(p.updatedAt));
            return daysSinceUpdate > 3;
        });
        setProjects(atRisk);
      }
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Paper>;

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <WarningAmberIcon color="warning" />
        <Typography variant="h6" fontWeight="bold">Projects at Risk</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Projects in review for more than 3 days.
      </Typography>

      {projects.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary', bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="body2">No projects at risk. Great job!</Typography>
        </Box>
      ) : (
        <List disablePadding>
            {projects.slice(0, 5).map((project) => (
                <ListItem 
                    key={project.id} 
                    disableGutters 
                    sx={{ 
                        borderBottom: 1, 
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        px: 1,
                        borderRadius: 1
                    }}
                    onClick={() => router.push(`/projects/${project.id}`)}
                >
                    <ListItemText 
                        primary={project.name}
                        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }}
                        secondary={`Last updated: ${new Date(project.updatedAt).toLocaleDateString()}`}
                    />
                    <Chip label={project.status} size="small" color="warning" variant="outlined" />
                </ListItem>
            ))}
        </List>
      )}
      {projects.length > 5 && (
        <Button fullWidth sx={{ mt: 2 }} onClick={() => router.push('/projects')}>View All</Button>
      )}
    </Paper>
  );
}
