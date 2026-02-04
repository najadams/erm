'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Container, ToggleButtonGroup, ToggleButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import ProjectList from '@/components/projects/ProjectList';
import BoardView from '@/components/projects/BoardView';
import CreateProjectModal from '@/components/projects/CreateProjectModal';

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'list' | 'board' | null,
  ) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <div>
            <Typography variant="h4" gutterBottom fontWeight="bold">
            Projects
            </Typography>
            <Typography variant="body1" color="text.secondary">
            Manage investment projects and case files suitable for GIPC compliance.
            </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewChange}
                aria-label="view mode"
                size="small"
            >
                <ToggleButton value="list" aria-label="list view">
                    <ViewListIcon />
                </ToggleButton>
                <ToggleButton value="board" aria-label="board view">
                    <ViewKanbanIcon />
                </ToggleButton>
            </ToggleButtonGroup>

            <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setModalOpen(true)}
            >
                New Project
            </Button>
        </Box>
      </Box>

      {viewMode === 'list' ? (
         <ProjectList refreshTrigger={refreshTrigger} />
      ) : (
         <BoardView refreshTrigger={refreshTrigger} />
      )}

      <CreateProjectModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={handleRefresh}
      />
    </Container>
  );
}
