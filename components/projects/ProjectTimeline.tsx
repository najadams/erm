'use client';

import React from 'react';
import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, differenceInDays, isWithinInterval } from 'date-fns';

interface ProjectTimelineProps {
  project: any;
}

export default function ProjectTimeline({ project }: ProjectTimelineProps) {
  if (!project.startDate || !project.endDate) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No timeline data available. Please set Start and End dates for this project.
        </Typography>
      </Paper>
    );
  }

  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  
  // Viewport range: Start of project year to End of project year (or wider if needed)
  // Let's show a 12-month window centered around the project or just the project year
  const viewStart = startOfMonth(new Date(startDate.getFullYear(), 0, 1)); // Jan 1st of start year
  const viewEnd = endOfMonth(new Date(endDate.getFullYear(), 11, 31)); // Dec 31st of end year

  // If span is huge, we might need a different approach, but for now assuming < 2-3 years
  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  // Calculate project position
  const startOffsetDays = differenceInDays(startDate, viewStart);
  const durationDays = differenceInDays(endDate, startDate) + 1;
  
  const leftPercent = (startOffsetDays / totalDays) * 100;
  const widthPercent = (durationDays / totalDays) * 100;

  return (
    <Paper sx={{ p: 3, overflowX: 'auto' }}>
      <Typography variant="h6" gutterBottom>Project Timeline</Typography>
      
      <Box sx={{ minWidth: 800, mt: 4 }}>
        {/* Months Header */}
        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          {months.map((month) => (
            <Box 
                key={month.toString()} 
                sx={{ 
                    flex: 1, 
                    textAlign: 'center', 
                    borderRight: 1, 
                    borderColor: 'divider', 
                    py: 1,
                    minWidth: 50
                }}
            >
              <Typography variant="caption" fontWeight="bold">
                {format(month, 'MMM yyyy')}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Timeline Grid */}
        <Box sx={{ position: 'relative', height: 100, bgcolor: 'background.default', borderRadius: 1 }}>
            {/* Project Bar */}
            <Tooltip title={`${format(startDate, 'PP')} - ${format(endDate, 'PP')}`}>
                <Box
                    sx={{
                        position: 'absolute',
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        top: 30,
                        height: 40,
                        bgcolor: 'primary.main',
                        borderRadius: 4,
                        boxShadow: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'primary.contrastText',
                        px: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'default',
                        transition: 'all 0.3s'
                    }}
                >
                    <Typography variant="subtitle2" fontWeight="bold">{project.name}</Typography>
                </Box>
            </Tooltip>
            
            {/* Today Marker if applicable */}
            {isWithinInterval(new Date(), { start: viewStart, end: viewEnd }) && (
                <Box 
                    sx={{ 
                        position: 'absolute', 
                        left: `${(differenceInDays(new Date(), viewStart) / totalDays) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        bgcolor: 'error.main',
                        zIndex: 1
                    }}
                >
                     <Typography 
                        variant="caption" 
                        sx={{ 
                            position: 'absolute', 
                            top: -20, 
                            left: -15, 
                            color: 'error.main', 
                            fontWeight: 'bold' 
                        }}
                    >
                        Today
                    </Typography>
                </Box>
            )}
        </Box>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 4 }}>
         <Box>
            <Typography variant="caption" color="text.secondary">Start Date</Typography>
            <Typography variant="body2" fontWeight="bold">{format(startDate, 'PP')}</Typography>
         </Box>
         <Box>
            <Typography variant="caption" color="text.secondary">End Date</Typography>
            <Typography variant="body2" fontWeight="bold">{format(endDate, 'PP')}</Typography>
         </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Duration</Typography>
            <Typography variant="body2" fontWeight="bold">{durationDays} days</Typography>
         </Box>
      </Box>
    </Paper>
  );
}
