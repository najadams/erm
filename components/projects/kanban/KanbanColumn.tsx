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
}

export default function KanbanColumn({ id, title, count, projects }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <Box sx={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column' }}>
       {/* Column Header */}
       <Paper 
         elevation={0}
         sx={{ 
            p: 2, 
            mb: 2, 
            borderBottom: 2, 
            borderColor: 'divider',
            bgcolor: isOver ? 'action.hover' : 'background.paper',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
         }}
        >
            <Typography variant="h6" fontWeight="bold">{title}</Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                    bgcolor: 'action.selected', 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1,
                    fontWeight: 'bold'
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
            bgcolor: isOver ? 'action.hover' : 'background.default',
            borderRadius: 2,
            p: 1,
            transition: 'background-color 0.2s'
         }}
       >
          {projects.map((project) => (
             <KanbanCard key={project.id} project={project} />
          ))}
          {projects.length === 0 && (
             <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="body2">No projects</Typography>
             </Box>
          )}
       </Box>
    </Box>
  );
}
