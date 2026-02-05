'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
    Container, 
    Box, 
    Typography, 
    CircularProgress, 
    Chip, 
    Tabs, 
    Tab, 
    Button,
    Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import OverviewTab from '@/components/projects/tabs/OverviewTab';
import CompanyTab from '@/components/projects/tabs/CompanyTab';
import MembersTab from '@/components/projects/tabs/MembersTab';
import RecordsTab from '@/components/projects/tabs/RecordsTab';
import ProjectWorkflow from '@/components/projects/ProjectWorkflow';
import ProjectTimeline from '@/components/projects/ProjectTimeline';
import ActivityTab from '@/components/projects/tabs/ActivityTab';

interface ProjectDetails {
  id: string;
  referenceNumber: string;
  name: string;
  status: string;
  description: string;
  type: string;
  priority: string;
  ownerUserId: string;
  registeredCompany: any;
  members: any[];
  projectGroups: any[];
  visibility: string;
  startDate?: string;
  endDate?: string;
  sector?: string;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} {...other} className="py-4">
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const currentUser = session?.user as { id: string; role?: string; } | undefined;
  const id = params?.id as string;
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (id) {
        fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) throw new Error('Failed to load project');
        const data = await res.json();
        setProject(data);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ mt: 4, textAlign: 'center' }}><Typography color="error">{error}</Typography></Box>;
  if (!project) return null;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
            <Link href="/projects" passHref>
                <Button startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>Back to Projects</Button>
            </Link>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight="bold">
                    {project.name}
                </Typography>
                <Chip label={project.status} color="primary" />
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {project.referenceNumber}
                </Typography>
            </Box>
        </Box>

        {/* Workflow */}
        <ProjectWorkflow 
            project={project} 
            currentUser={currentUser} 
            onStatusChange={fetchProject} 
        />

        {/* Tabs */}
        <Paper square elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
             <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                <Tab label="Overview" />
                <Tab label="Company" />
                <Tab label="Timeline" />
                <Tab label="Records" />
                <Tab label="Activity" />
                <Tab label="Members" />
             </Tabs>
        </Paper>

        <TabPanel value={tabValue} index={0}>
            <OverviewTab project={project} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
            <CompanyTab company={project.registeredCompany} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
            <ProjectTimeline project={project} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
            <RecordsTab />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
            <ActivityTab />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
            <MembersTab 
                members={project.members} 
                projectId={project.id}
                currentUser={currentUser}
                onUpdate={fetchProject}
            />
        </TabPanel>

    </Container>
  );
}
