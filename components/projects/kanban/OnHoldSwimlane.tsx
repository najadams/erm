'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box, Paper, Typography, Chip } from '@mui/material';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import KanbanCard from './KanbanCard';

interface OnHoldSwimlaneProps {
  projects: any[];
  isValidDropTarget?: boolean | null;
}

export default function OnHoldSwimlane({ projects, isValidDropTarget }: OnHoldSwimlaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'ON_HOLD',
  });

  const getBorderColor = () => {
    if (isValidDropTarget === null) return '#ffc107';
    if (isValidDropTarget) return '#4caf50';
    return '#f44336';
  };

  const getBgColor = () => {
    if (isOver && isValidDropTarget) return '#e8f5e9';
    if (isOver && isValidDropTarget === false) return '#ffebee';
    return '#fff8e1';
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: 2,
          borderColor: getBorderColor(),
          borderStyle: isValidDropTarget === false ? 'dashed' : 'solid',
          bgcolor: getBgColor(),
          borderRadius: 2,
          transition: 'all 0.2s ease',
          opacity: isValidDropTarget === false ? 0.6 : 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PauseCircleIcon sx={{ fontSize: 20, color: '#ff8f00' }} />
          <Typography variant="h6" fontWeight="bold" color="#ff8f00">
            On Hold
          </Typography>
          <Chip
            label={projects.length}
            size="small"
            sx={{
              bgcolor: '#ffc107',
              color: '#fff',
              fontWeight: 'bold',
              minWidth: 28,
            }}
          />
        </Box>

        <Box
          ref={setNodeRef}
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            minHeight: 120,
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#ffc107',
              borderRadius: 3,
            },
          }}
        >
          {projects.map((project) => (
            <Box key={project.id} sx={{ minWidth: 280, maxWidth: 280 }}>
              <KanbanCard project={project} />
            </Box>
          ))}
          {projects.length === 0 && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 3,
                color: 'text.secondary',
                border: '1px dashed',
                borderColor: '#ffc107',
                borderRadius: 2,
                minHeight: 100,
              }}
            >
              <Typography variant="body2">
                Drag projects here to put them on hold
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
