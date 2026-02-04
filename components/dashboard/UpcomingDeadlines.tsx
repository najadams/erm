'use client';

import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, CircularProgress, Button } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { useRouter } from 'next/navigation';
import { differenceInDays, parseISO, isAfter } from 'date-fns';

export default function UpcomingDeadlines() {
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
        // Filter for deadlines in next 14 days
        const now = new Date();
        const upcoming = data.filter((p: any) => {
            if (!p.endDate) return false;
            const endDate = parseISO(p.endDate);
            const daysUntil = differenceInDays(endDate, now);
            
            // Show if endDate is in future (or today) AND within 14 days
            return isAfter(endDate, now) && daysUntil <= 14;
        }).sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        setProjects(upcoming);
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
        <EventIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">Upcoming Deadlines</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Projects ending within the next 14 days.
      </Typography>

      {projects.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary', bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="body2">No upcoming project deadlines.</Typography>
        </Box>
      ) : (
        <List disablePadding>
            {projects.slice(0, 5).map((project) => {
                const daysLeft = differenceInDays(parseISO(project.endDate), new Date());
                return (
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
                            secondary={new Date(project.endDate).toLocaleDateString()}
                        />
                        <Typography 
                            variant="caption" 
                            fontWeight="bold" 
                            color={daysLeft < 3 ? 'error.main' : 'text.primary'}
                        >
                            {daysLeft} days left
                        </Typography>
                    </ListItem>
                );
            })}
        </List>
      )}
      {projects.length > 5 && (
        <Button fullWidth sx={{ mt: 2 }} onClick={() => router.push('/projects')}>View All</Button>
      )}
    </Paper>
  );
}
