'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

interface Project {
  id: string;
  name: string;
  referenceNumber?: string;
  status: string;
}

interface Department {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AccessControlProps {
  data: {
    visibility: string;
    projectId: string;
    departmentId: string;
    sharedUsers: string[];
    sharedGroups: string[];
  };
  onChange: (field: string, value: any) => void;
}

export default function AccessControl({ data, onChange }: AccessControlProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [groupsRes, usersRes, projectsRes, deptsRes] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/users'),
          fetch('/api/projects'),
          fetch('/api/departments')
        ]);

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          if (Array.isArray(groupsData)) {
            // Filter out PROJECT type groups (now using dedicated Project model)
            setAvailableGroups(groupsData.filter((g: Group) => g.type !== 'PROJECT'));
          }
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (Array.isArray(usersData)) setAvailableUsers(usersData);
        }

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          if (Array.isArray(projectsData)) {
            // Only show active projects
            setProjects(projectsData.filter((p: Project) => p.status !== 'CLOSED'));
          }
        }

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          if (Array.isArray(deptsData)) setDepartments(deptsData);
        }
      } catch (error) {
        console.error('Error fetching access control data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>Access & Visibility</Typography>

      {/* Department Assignment */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Department Assignment
        </Typography>
        <Autocomplete
          options={departments}
          getOptionLabel={(option) => option.name}
          value={departments.find(d => d.id === data.departmentId) || null}
          onChange={(_, newValue) => {
            onChange('departmentId', newValue ? newValue.id : '');
          }}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Assign to Department (Optional)"
              placeholder="Select Department..."
              helperText="Department members will have access based on their clearance level."
            />
          )}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Project Context */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Project / Case Context
        </Typography>
        <Autocomplete
          options={projects}
          getOptionLabel={(option) => `${option.name}${option.referenceNumber ? ` (${option.referenceNumber})` : ''}`}
          value={projects.find(p => p.id === data.projectId) || null}
          onChange={(_, newValue) => {
            onChange('projectId', newValue ? newValue.id : '');
          }}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Assign to Project (Optional)"
              placeholder="Select Project..."
              helperText="Assigning to a project grants access to all project members."
            />
          )}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Visibility Scope */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Visibility Scope</FormLabel>
        <RadioGroup
          value={data.visibility}
          onChange={(e) => onChange('visibility', e.target.value)}
        >
          <FormControlLabel
            value="PRIVATE"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="500">Private</Typography>
                <Typography variant="caption" color="text.secondary">Only me + Admins can view</Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="DEPARTMENT"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="500">Department</Typography>
                <Typography variant="caption" color="text.secondary">All members of the assigned department</Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="SHARED"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="500">Shared</Typography>
                <Typography variant="caption" color="text.secondary">Specific users and groups I select</Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="PUBLIC"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="500">Organization-wide</Typography>
                <Typography variant="caption" color="text.secondary">All GIPC staff can view (subject to clearance)</Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      {/* Shared Users/Groups (only shown when SHARED is selected) */}
      {data.visibility === 'SHARED' && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              multiple
              options={availableGroups}
              getOptionLabel={(option) => option.name}
              value={availableGroups.filter(g => data.sharedGroups.includes(g.id))}
              onChange={(_, newValue) => {
                onChange('sharedGroups', newValue.map(v => v.id));
              }}
              loading={loading}
              renderInput={(params) => (
                <TextField {...params} label="Share with Groups" placeholder="Select groups" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      key={key}
                      {...tagProps}
                      color={option.type === 'DEPARTMENT' ? 'primary' : 'default'}
                    />
                  );
                })
              }
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              multiple
              options={availableUsers}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={availableUsers.filter(u => data.sharedUsers.includes(u.id))}
              onChange={(_, newValue) => {
                onChange('sharedUsers', newValue.map(v => v.id));
              }}
              loading={loading}
              renderInput={(params) => (
                <TextField {...params} label="Share with Users" placeholder="Select users" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip variant="outlined" label={option.name} key={key} {...tagProps} />
                  );
                })
              }
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
}
