'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Box, CircularProgress, Backdrop } from '@mui/material';
import KanbanColumn from './kanban/KanbanColumn';
import KanbanCard from './kanban/KanbanCard';

interface BoardViewProps {
  refreshTrigger: number;
}

export default function BoardView({ refreshTrigger }: BoardViewProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (res.ok) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveProject(active.data.current?.project);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as string; // The column ID is now the Status ID (e.g. 'DRAFT', 'ACTIVE')
    
    // Find current project
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    if (project.status === newStatus) return; // No change

    // Optimistic Update
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            return { ...p, status: newStatus };
        }
        return p;
    }));

    // API Call
    try {
        await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    } catch (error) {
        console.error('Failed to update status', error);
        // Revert on fail? For now, let's just refresh.
        fetchProjects();
    }
  };
  
  };

  const columns = [
     { id: 'DRAFT', title: 'Draft', statuses: ['DRAFT'] },
     { id: 'SUBMITTED', title: 'Submitted', statuses: ['SUBMITTED'] },
     { id: 'IN_REVIEW', title: 'In Review', statuses: ['IN_REVIEW'] },
     { id: 'APPROVED', title: 'Approved', statuses: ['APPROVED'] },
     { id: 'ACTIVE', title: 'Active', statuses: ['ACTIVE'] },
     { id: 'ON_HOLD', title: 'On Hold', statuses: ['ON_HOLD'] },
     { id: 'COMPLETED', title: 'Completed', statuses: ['COMPLETED'] },
     { id: 'ARCHIVED', title: 'Archived', statuses: ['ARCHIVED'] }
  ];

  if (loading && projects.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, height: 'calc(100vh - 200px)' }}>
            {columns.map(col => {
                const colProjects = projects.filter(p => col.statuses.includes(p.status));
                return (
                    <KanbanColumn 
                        key={col.id} 
                        id={col.id} 
                        title={col.title} 
                        count={colProjects.length} 
                        projects={colProjects} 
                    />
                );
            })}
        </Box>
        <DragOverlay>
            {activeProject ? <KanbanCard project={activeProject} /> : null}
        </DragOverlay>
    </DndContext>
  );
}
