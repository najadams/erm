'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box, Paper, Typography, Chip, IconButton, Collapse } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KanbanCard from './KanbanCard';

interface ArchivedSectionProps {
  projects: any[];
  isExpanded: boolean;
  onToggle: () => void;
  isValidDropTarget?: boolean | null;
}

export default function ArchivedSection({
  projects,
  isExpanded,
  onToggle,
  isValidDropTarget,
}: ArchivedSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'ARCHIVED',
  });

  const getBorderColor = () => {
    if (isValidDropTarget === null) return '#90a4ae';
    if (isValidDropTarget) return '#4caf50';
    return '#f44336';
  };

  const getBgColor = () => {
    if (isOver && isValidDropTarget) return '#e8f5e9';
    if (isOver && isValidDropTarget === false) return '#ffebee';
    return '#eceff1';
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Paper
        elevation={0}
        sx={{
          border: 2,
          borderColor: getBorderColor(),
          borderStyle: isValidDropTarget === false ? 'dashed' : 'solid',
          bgcolor: getBgColor(),
          borderRadius: 2,
          transition: 'all 0.2s ease',
          opacity: isValidDropTarget === false ? 0.6 : 1,
        }}
      >
        <Box
          ref={setNodeRef}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={onToggle}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ArchiveIcon sx={{ fontSize: 20, color: '#546e7a' }} />
            <Typography variant="h6" fontWeight="bold" color="#546e7a">
              Archived
            </Typography>
            <Chip
              label={projects.length}
              size="small"
              sx={{
                bgcolor: '#90a4ae',
                color: '#fff',
                fontWeight: 'bold',
                minWidth: 28,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isExpanded ? 'Hide' : 'Show'}
            </Typography>
            <IconButton size="small">
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={isExpanded}>
          <Box
            sx={{
              p: 2,
              pt: 0,
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: '#90a4ae',
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
                  borderColor: '#90a4ae',
                  borderRadius: 2,
                  minHeight: 100,
                }}
              >
                <Typography variant="body2">No archived projects</Typography>
              </Box>
            )}
          </Box>
        </Collapse>

        {!isExpanded && projects.length > 0 && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Drag projects here to archive. Click to view {projects.length} archived project
              {projects.length !== 1 ? 's' : ''}.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
