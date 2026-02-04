'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Box, Paper, Typography, Chip, Avatar, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';

interface KanbanCardProps {
  project: any;
}

export default function KanbanCard({ project }: KanbanCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      sx={{
        mb: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:active': { cursor: 'grabbing' }
      }}
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <Paper sx={{ p: 2, '&:hover': { boxShadow: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {project.referenceNumber}
          </Typography>
          <Chip label={project.type} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
        </Box>
        
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.2 }}>
          {project.name}
        </Typography>
        
        {project.registeredCompany && (
           <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
             {project.registeredCompany.name}
           </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Tooltip title={`Owner: ${project.owner.name}`}>
             <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                {project.owner.name.charAt(0)}
             </Avatar>
          </Tooltip>
          <Typography variant="caption" color="text.secondary">
            {new Date(project.updatedAt).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
