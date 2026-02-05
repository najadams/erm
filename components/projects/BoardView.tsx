'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material';
import KanbanColumn from './kanban/KanbanColumn';
import KanbanCard from './kanban/KanbanCard';
import OnHoldSwimlane from './kanban/OnHoldSwimlane';
import ArchivedSection from './kanban/ArchivedSection';
import {
  MAIN_WORKFLOW_STATUSES,
  STATUS_CONFIG,
  canTransition,
  getAllowedTargets,
  ProjectStatus,
} from '@/lib/projectStatusTransitions';

interface BoardViewProps {
  refreshTrigger: number;
}

export default function BoardView({ refreshTrigger }: BoardViewProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [validDropTargets, setValidDropTargets] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

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

  // Memoize project grouping by status
  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatus, any[]> = {
      DRAFT: [],
      SUBMITTED: [],
      IN_REVIEW: [],
      APPROVED: [],
      ACTIVE: [],
      ON_HOLD: [],
      COMPLETED: [],
      ARCHIVED: [],
    };

    projects.forEach((project) => {
      const status = project.status as ProjectStatus;
      if (grouped[status]) {
        grouped[status].push(project);
      }
    });

    return grouped;
  }, [projects]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const project = active.data.current?.project;
    setActiveProject(project);

    // Calculate valid drop targets based on current project status
    if (project) {
      const allowedTargets = getAllowedTargets(project.status);
      const targets: Record<string, boolean> = {};

      // Check all possible drop zones
      [...MAIN_WORKFLOW_STATUSES, 'ON_HOLD', 'ARCHIVED'].forEach((status) => {
        targets[status] = allowedTargets.includes(status as ProjectStatus);
      });

      setValidDropTargets(targets);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback is already handled by validDropTargets state
    // This handler can be used for additional effects if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset drag state
    setActiveId(null);
    setActiveProject(null);
    setValidDropTargets({});

    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as string;

    // Find current project
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Check if we're dropping on the same status column
    if (project.status === newStatus) return;

    // Validate transition client-side
    if (!canTransition(project.status, newStatus)) {
      const allowedTargets = getAllowedTargets(project.status);
      setErrorMessage(
        `Cannot move from "${STATUS_CONFIG[project.status as ProjectStatus]?.label || project.status}" to "${STATUS_CONFIG[newStatus as ProjectStatus]?.label || newStatus}". ` +
          `Allowed: ${allowedTargets.map((s) => STATUS_CONFIG[s]?.label || s).join(', ')}`
      );
      return;
    }

    // Optimistic Update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return { ...p, status: newStatus };
        }
        return p;
      })
    );

    // API Call
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update status');
        // Revert on fail
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to update status', error);
      setErrorMessage('Failed to update project status');
      fetchProjects();
    }
  };

  const handleCloseError = () => {
    setErrorMessage(null);
  };

  // Determine drop target validity for a given status
  const getDropTargetValidity = (status: string): boolean | null => {
    if (!activeProject) return null; // Not dragging
    return validDropTargets[status] ?? false;
  };

  if (loading && projects.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Main Workflow Columns */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            height: 'calc(100vh - 380px)',
            minHeight: 400,
            '&::-webkit-scrollbar': {
              height: 8,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#bdbdbd',
              borderRadius: 4,
            },
          }}
        >
          {MAIN_WORKFLOW_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={STATUS_CONFIG[status].label}
              count={projectsByStatus[status].length}
              projects={projectsByStatus[status]}
              statusConfig={STATUS_CONFIG[status]}
              isValidDropTarget={getDropTargetValidity(status)}
            />
          ))}
        </Box>

        {/* ON_HOLD Swimlane */}
        <OnHoldSwimlane
          projects={projectsByStatus.ON_HOLD}
          isValidDropTarget={getDropTargetValidity('ON_HOLD')}
        />

        {/* ARCHIVED Section */}
        <ArchivedSection
          projects={projectsByStatus.ARCHIVED}
          isExpanded={archivedExpanded}
          onToggle={() => setArchivedExpanded(!archivedExpanded)}
          isValidDropTarget={getDropTargetValidity('ARCHIVED')}
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeProject ? <KanbanCard project={activeProject} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
