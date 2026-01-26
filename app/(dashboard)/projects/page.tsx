'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ProjectList from '@/components/projects/ProjectList';
import CreateProjectModal from '@/components/projects/CreateProjectModal';

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
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
        <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
        >
            New Project
        </Button>
      </Box>

      <ProjectList refreshTrigger={refreshTrigger} />

      <CreateProjectModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={handleRefresh}
      />
    </Container>
  );
}
