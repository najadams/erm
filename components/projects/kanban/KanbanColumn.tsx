'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box, Paper, Typography } from '@mui/material';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  projects: any[];
  statusConfig?: {
    bgColor: string;
    borderColor: string;
    textColor: string;
  };
  isValidDropTarget?: boolean | null; // null = not dragging, true/false = during drag
}

export default function KanbanColumn({
  id,
  title,
  count,
  projects,
  statusConfig,
  isValidDropTarget,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const getHeaderBorderColor = () => {
    if (isValidDropTarget === null) {
      return statusConfig?.borderColor || 'divider';
    }
    if (isValidDropTarget) return '#4caf50';
    return '#f44336';
  };

  const getDropAreaBg = () => {
    if (isOver && isValidDropTarget) return '#e8f5e9';
    if (isOver && isValidDropTarget === false) return '#ffebee';
    if (isOver) return 'action.hover';
    return statusConfig?.bgColor || 'background.default';
  };

  const getDropAreaBorder = () => {
    if (isValidDropTarget === true) return '2px solid #4caf50';
    if (isValidDropTarget === false) return '2px dashed #f44336';
    return 'none';
  };

  return (
    <Box
      sx={{
        flex: '0 0 auto',
        width: 280,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        opacity: isValidDropTarget === false ? 0.5 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Column Header */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1.5,
          borderBottom: 3,
          borderColor: getHeaderBorderColor(),
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 1,
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          sx={{ color: statusConfig?.textColor || 'text.primary' }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            bgcolor: statusConfig?.borderColor || 'action.selected',
            color: '#fff',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontWeight: 'bold',
            minWidth: 24,
            textAlign: 'center',
          }}
        >
          {count}
        </Typography>
      </Paper>

      {/* Droppable Area */}
      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          bgcolor: getDropAreaBg(),
          borderRadius: 2,
          p: 1,
          transition: 'all 0.2s ease',
          border: getDropAreaBorder(),
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: statusConfig?.borderColor || 'divider',
            borderRadius: 3,
          },
        }}
      >
        {projects.map((project) => (
          <KanbanCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              color: 'text.secondary',
              border: '1px dashed',
              borderColor: statusConfig?.borderColor || 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2">No projects</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
