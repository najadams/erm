'use client';

import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  referenceNumber: string;
  name: string;
  type: string;
  status: string;
  owner: { name: string; email: string };
  registeredCompany: { name: string; registrationNumber: string } | null;
  createdAt: string;
}

export default function ProjectList({ refreshTrigger }: { refreshTrigger: number }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'ACTIVE': return 'success';
      case 'IN_REVIEW': return 'warning';
      case 'SUBMITTED': return 'info';
      case 'DRAFT': return 'default';
      case 'ARCHIVED': return 'error';
      default: return 'default';
    }
  };

  const ccolumns: GridColDef[] = [
    { 
        field: 'referenceNumber', 
        headerName: 'Ref No.', 
        width: 150,
        renderCell: (params) => (
            <span className="font-mono text-sm">{params.value || '---'}</span>
        )
    },
    { field: 'name', headerName: 'Project Name', flex: 1, minWidth: 200 },
    { 
        field: 'registeredCompany', 
        headerName: 'Company', 
        width: 250,
        renderCell: (params: GridRenderCellParams) => {
            const comps = params.row.projectCompanies || [];
            // If new M:N data exists
            if (comps.length > 0) {
                const primary = comps.find((c: any) => c.role === 'PRIMARY_INVESTOR') || comps[0];
                const count = comps.length;
                return (
                    <div>
                        <div>{primary.company?.name || 'Unknown'}</div>
                        {count > 1 && (
                            <div className="text-xs text-gray-500">+{count - 1} others</div>
                        )}
                    </div>
                );
            }
            // Legacy Fallback
            return params.row.registeredCompany?.name || '---';
        }
    },
    { field: 'type', headerName: 'Type', width: 130 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
            label={params.value} 
            size="small" 
            color={getStatusColor(params.value as string) as any} 
        />
      )
    },
    { 
        field: 'owner', 
        headerName: 'Case Officer', 
        width: 180,
        valueGetter: (params: any) => params?.name || params?.email
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Details">
            <IconButton onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                router.push(`/projects/${params.row.id}`);
            }}>
            <VisibilityIcon />
            </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <DataGrid
        rows={projects}
        columns={ccolumns}
        loading={loading}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
        onRowClick={(params) => router.push(`/projects/${params.row.id}`)}
        sx={{
            '& .MuiDataGrid-row:hover': {
                cursor: 'pointer'
            }
        }}
      />
    </Box>
  );
}
