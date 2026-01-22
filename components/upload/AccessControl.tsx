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

interface AccessControlProps {
  data: {
    visibility: string;
    projectId: string; // New
    sharedUsers: string[];
    sharedGroups: string[];
  };
  onChange: (field: string, value: any) => void;
}

export default function AccessControl({ data, onChange }: AccessControlProps) {
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{id: string, name: string, type: string}[]>([]);

  useEffect(() => {
    // 1. Fetch Groups
    fetch('/api/groups')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAvailableGroups(data);
        })
        .catch(console.error);

    // 2. Fetch Users (Real)
    fetch('/api/users')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAvailableUsers(data);
        })
        .catch(console.error);
  }, []);

  const projects = availableGroups.filter(g => g.type === 'PROJECT');
  const otherGroups = availableGroups.filter(g => g.type !== 'PROJECT');

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>Access & Visibility</Typography>
      
      {/* Project Context */}
      <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Project / Case Context</Typography>
          <Autocomplete
                options={projects}
                getOptionLabel={(option) => option.name}
                value={projects.find(p => p.id === data.projectId) || null}
                onChange={(_, newValue) => {
                    onChange('projectId', newValue ? newValue.id : '');
                }}
                renderInput={(params) => (
                    <TextField {...params} label="Assign to Project (Optional)" placeholder="Select Project..." helperText="Assigning to a project grants access to all project members."/>
                )}
            />
      </Box>

      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Visibility Scope</FormLabel>
        <RadioGroup
          value={data.visibility}
          onChange={(e) => onChange('visibility', e.target.value)}
        >
          <FormControlLabel value="PRIVATE" control={<Radio />} label="🔒 Private (Only me + Admins)" />
          <FormControlLabel value="SHARED" control={<Radio />} label="👥 Shared (Selected users/groups)" />
          {/* <FormControlLabel value="DEPARTMENT" control={<Radio />} label="🌐 Department-wide" /> */}
          {/* <FormControlLabel value="PUBLIC" control={<Radio />} label="🏢 Organization-wide" /> */}
        </RadioGroup>
      </FormControl>

      {data.visibility === 'SHARED' && (
        <React.Fragment>
            <Box sx={{ mb: 2 }}>
                <Autocomplete
                    multiple
                    options={otherGroups}
                    getOptionLabel={(option) => option.name}
                    value={otherGroups.filter(g => data.sharedGroups.includes(g.id))}
                    onChange={(_, newValue) => {
                        onChange('sharedGroups', newValue.map(v => v.id));
                    }}
                    renderInput={(params) => (
                        <TextField {...params} label="Share with Groups" placeholder="Select groups" />
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
            <Box sx={{ mb: 2 }}>
                <Autocomplete
                    multiple
                    options={availableUsers}
                    getOptionLabel={(option) => option.name}
                    value={availableUsers.filter(u => data.sharedUsers.includes(u.id))}
                    onChange={(_, newValue) => {
                         onChange('sharedUsers', newValue.map(v => v.id));
                    }}
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
        </React.Fragment>
      )}
    </Paper>
  );
}
