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
    const newStatusGroup = over.id as string;
    
    // Find current project
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Check if status actually needs changing
    // Map Droppable IDs to actual Statuses (simplified for "Main" status of that group)
    // Draft -> DRAFT
    // In Review -> SUBMITTED (or IN_REVIEW?) -> Let's default to IN_REVIEW for drag drop
    // Active -> ACTIVE

    let newStatus = '';
    if (newStatusGroup === 'draft') newStatus = 'DRAFT';
    else if (newStatusGroup === 'review') newStatus = 'IN_REVIEW';
    else if (newStatusGroup === 'active') newStatus = 'ACTIVE';
    else return;

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
  
  // Filter projects into columns
  const draftProjects = projects.filter(p => p.status === 'DRAFT');
  const reviewProjects = projects.filter(p => ['SUBMITTED', 'IN_REVIEW'].includes(p.status));
  const activeProjects = projects.filter(p => ['APPROVED', 'ACTIVE'].includes(p.status));

  if (loading && projects.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, height: 'calc(100vh - 200px)' }}>
            <KanbanColumn id="draft" key="draft" title="Draft" count={draftProjects.length} projects={draftProjects} />
            <KanbanColumn id="review" key="review" title="In Review" count={reviewProjects.length} projects={reviewProjects} />
            <KanbanColumn id="active" key="active" title="Active" count={activeProjects.length} projects={activeProjects} />
        </Box>
        <DragOverlay>
            {activeProject ? <KanbanCard project={activeProject} /> : null}
        </DragOverlay>
    </DndContext>
  );
}
