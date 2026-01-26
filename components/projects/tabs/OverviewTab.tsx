import React from 'react';
import { GridLegacy as Grid, Card, CardContent, Typography, Chip, Box, Divider } from '@mui/material';

interface Project {
  description?: string;
  type: string;
  priority: string;
  sector?: string;
  startDate?: string;
  endDate?: string;
  visibility: string;
  status: string;
}

export default function OverviewTab({ project }: { project: Project }) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    {project.description || 'No description provided.'}
                </Typography>
            </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
         <Card sx={{ mb: 2 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>Metadata</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>
                        <Typography variant="caption" color="text.secondary">Type</Typography>
                        <Typography variant="body1">{project.type}</Typography>
                    </div>
                    <div>
                        <Typography variant="caption" color="text.secondary">Sector</Typography>
                        <Typography variant="body1">{project.sector || 'N/A'}</Typography>
                    </div>
                     <div>
                        <Typography variant="caption" color="text.secondary">Priority</Typography>
                        <Chip label={project.priority} size="small" color={project.priority === 'CRITICAL' ? 'error' : 'default' as any} />
                    </div>
                    <div>
                        <Typography variant="caption" color="text.secondary">Visibility</Typography>
                        <Typography variant="body1">{project.visibility}</Typography>
                    </div>
                </Box>
            </CardContent>
         </Card>
         <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>Timeline</Typography>
                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>
                        <Typography variant="caption" color="text.secondary">Start Date</Typography>
                        <Typography variant="body1">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                    </div>
                    <div>
                        <Typography variant="caption" color="text.secondary">End Date</Typography>
                         <Typography variant="body1">
                            {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                    </div>
                </Box>
            </CardContent>
         </Card>
      </Grid>
    </Grid>
  );
}
