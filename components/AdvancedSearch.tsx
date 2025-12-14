'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography,
  Chip,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

interface Group {
  id: string;
  name: string;
}

interface FilterState {
  q: string;
  status: string;
  groupId: string;
  startDate: string;
  endDate: string;
  tag: string;
  uploader: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: FilterState) => void;
  initialValues?: Partial<FilterState>;
}

export default function AdvancedSearch({ onSearch, initialValues }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<FilterState>({
    q: initialValues?.q || '',
    status: initialValues?.status || '',
    groupId: initialValues?.groupId || '',
    startDate: initialValues?.startDate || '',
    endDate: initialValues?.endDate || '',
    tag: initialValues?.tag || '',
    uploader: initialValues?.uploader || ''
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Fetch groups for the dropdown
    fetch('/api/groups')
      .then(res => {
         if (res.ok) return res.json();
         return []; // unauthorized or failed
      })
      .then(data => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch(err => console.error('Failed to load groups', err));
  }, []);

  const handleChange = (field: keyof FilterState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    const emptyFilters = {
        q: '',
        status: '',
        groupId: '',
        startDate: '',
        endDate: '',
        tag: '',
        uploader: ''
    };
    setFilters(emptyFilters);
    onSearch(emptyFilters);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField 
          fullWidth 
          placeholder="Search documents..." 
          value={filters.q}
          onChange={handleChange('q')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: <SearchIcon color="action" />
          }}
        />
        <Button variant="contained" onClick={handleSearch}>Search</Button>
      </Stack>

      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Advanced Filters</Typography>
          {(filters.status || filters.groupId || filters.tag || filters.startDate) && (
             <Chip size="small" label="Active" color="primary" sx={{ ml: 2 }} />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField 
                select 
                fullWidth 
                label="Department/Group" 
                value={filters.groupId} 
                onChange={handleChange('groupId')}
              >
                <MenuItem value="">All</MenuItem>
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField 
                select 
                fullWidth 
                label="Status" 
                value={filters.status} 
                onChange={handleChange('status')}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="ARCHIVED">Archived</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <TextField 
                fullWidth 
                label="Tag" 
                value={filters.tag} 
                onChange={handleChange('tag')}
                placeholder="search by tag"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                type="date" 
                fullWidth 
                label="Start Date" 
                value={filters.startDate} 
                onChange={handleChange('startDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                type="date" 
                fullWidth 
                label="End Date" 
                value={filters.endDate} 
                onChange={handleChange('endDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <Button variant="outlined" onClick={handleClear} size="small">Clear Filters</Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
