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
    sharedUsers: string[];
    sharedGroups: string[];
  };
  onChange: (field: string, value: any) => void;
}

export default function AccessControl({ data, onChange }: AccessControlProps) {
  // Mock data for users and groups - in real app this would come from API
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    // Simulate fetching
    setAvailableUsers([
        { id: '1', name: 'Alice Admin' },
        { id: '2', name: 'Bob Manager' },
        { id: '3', name: 'Charlie User' },
    ]);
    setAvailableGroups([
        { id: 'g1', name: 'HR Team' }, 
        { id: 'g2', name: 'Legal Team' },
        { id: 'g3', name: 'Management' }
    ]);
  }, []);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>Access & Visibility</Typography>
      
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Visibility Scope</FormLabel>
        <RadioGroup
          value={data.visibility}
          onChange={(e) => onChange('visibility', e.target.value)}
        >
          <FormControlLabel value="PRIVATE" control={<Radio />} label="🔒 Private (Only me + Admins)" />
          <FormControlLabel value="SHARED" control={<Radio />} label="👥 Shared (Selected users/groups)" />
          <FormControlLabel value="DEPARTMENT" control={<Radio />} label="🌐 Department-wide" />
          <FormControlLabel value="PUBLIC" control={<Radio />} label="🏢 Organization-wide" />
        </RadioGroup>
      </FormControl>

      {data.visibility === 'SHARED' && (
        <React.Fragment>
            <Box sx={{ mb: 2 }}>
                <Autocomplete
                    multiple
                    options={availableGroups}
                    getOptionLabel={(option) => option.name}
                    value={availableGroups.filter(g => data.sharedGroups.includes(g.id))}
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
