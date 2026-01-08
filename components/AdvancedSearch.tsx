'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Stack,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { debounce } from 'lodash';

interface Group {
  id: string;
  name: string;
}

interface RecordType {
  id: string;
  name: string;
}

export interface FilterState {
  q: string;
  status: string;
  groupId: string;
  startDate: string;
  endDate: string;
  tag: string;
  uploader: string;
  recordTypeId: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: FilterState) => void;
  initialValues?: Partial<FilterState>;
  recordTypes?: RecordType[];
}

export default function AdvancedSearch({ onSearch, initialValues, recordTypes = [] }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<FilterState>({
    q: initialValues?.q || '',
    status: initialValues?.status || '',
    groupId: initialValues?.groupId || '',
    startDate: initialValues?.startDate || '',
    endDate: initialValues?.endDate || '',
    tag: initialValues?.tag || '',
    uploader: initialValues?.uploader || '',
    recordTypeId: initialValues?.recordTypeId || ''
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [expanded, setExpanded] = useState(false);
  
  // Count active filters (excluding search query 'q')
  const activeFilterCount = Object.entries(filters).filter(([key, val]) => {
    return key !== 'q' && val !== '';
  }).length;

  useEffect(() => {
    // Fetch departments/groups
    fetch('/api/groups')
      .then(res => {
         if (res.ok) return res.json();
         return []; 
      })
      .then(data => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch(err => console.error('Failed to load groups', err));
  }, []);

  // Debounced Search Trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((nextFilters: FilterState) => {
      onSearch(nextFilters);
    }, 500),
    []
  );

  const handleChange = (field: keyof FilterState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const nextFilters = { ...filters, [field]: newValue };
    setFilters(nextFilters);
    
    if (field === 'q') {
       debouncedSearch(nextFilters);
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    onSearch(nextFilters);
  };

  const handleManualSearch = () => {
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
        uploader: '',
        recordTypeId: ''
    };
    setFilters(emptyFilters);
    onSearch(emptyFilters);
  };

  const applyDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    
    // YTD Logic check
    if (days === 999) {
        const ytdStart = new Date(new Date().getFullYear(), 0, 1);
        const next = { 
            ...filters, 
            startDate: fmt(ytdStart), 
            endDate: fmt(new Date()) 
        };
        setFilters(next);
        onSearch(next);
        return;
    }
    
    const next = { 
        ...filters, 
        startDate: fmt(start), 
        endDate: fmt(end) 
    };
    setFilters(next);
    onSearch(next);
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search Header */}
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        <TextField 
          fullWidth 
          placeholder="Search by name, tag, department, or content..." 
          value={filters.q}
          onChange={handleChange('q')}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'background.paper'
            }
          }}
        />
        <Tooltip title="Search">
            <Button 
                variant="contained" 
                size="large" 
                onClick={handleManualSearch}
                sx={{ px: 4, borderRadius: 2 }}
            >
                Search
            </Button>
        </Tooltip>
      </Stack>
      
      {/* Helper Text */}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 2, display: 'block' }}>
        Press Enter to search
      </Typography>

      {/* Advanced Filters Accordion */}
      <Accordion 
        expanded={expanded} 
        onChange={() => setExpanded(!expanded)}
        variant="outlined"
        sx={{ 
            borderRadius: '8px !important', 
            '&:before': { display: 'none' },
            borderColor: activeFilterCount > 0 ? 'primary.main' : 'divider'
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} width="100%">
            <Box display="flex" alignItems="center">
                <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography fontWeight="500">Advanced Filters</Typography>
            </Box>
            
            {activeFilterCount > 0 && (
                <Chip 
                    label={`${activeFilterCount} active`} 
                    size="small" 
                    color="primary" 
                    onDelete={(e) => {
                        e.stopPropagation(); // prevent accordion toggle
                        handleClear();
                    }}
                />
            )}
            
            {!expanded && activeFilterCount === 0 && (
                 <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Refine by ownership, lifecycle, or date
                 </Typography>
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box sx={{ mb: 2 }}>
             <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Refine your search
             </Typography>
             <Typography variant="caption" color="text.secondary">
                Use filters to narrow records by ownership, lifecycle state, or time.
             </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Row 1: Type, Status, Group */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField 
                select 
                fullWidth 
                label="Record Type" 
                value={filters.recordTypeId}
                onChange={(e) => handleFilterChange('recordTypeId', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {recordTypes.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField 
                select 
                fullWidth 
                label="Status" 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="ARCHIVED">Archived</MenuItem>
              </TextField>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField 
                select 
                fullWidth 
                label="Department / Group" 
                value={filters.groupId} 
                onChange={(e) => handleFilterChange('groupId', e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Row 2: Tag, Date Range */}
            <Grid size={{ xs: 12, sm: 6 }}>
               <TextField 
                fullWidth 
                label="Tags" 
                value={filters.tag} 
                onChange={handleChange('tag')} 
                placeholder="e.g. payroll, urgent"
                helperText="Separate multiple tags with commas"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={1}>
                 <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption">Date Range</Typography>
                    <Stack direction="row" spacing={1}>
                        <Chip 
                            label="7d" 
                            size="small" 
                            onClick={() => applyDatePreset(7)} 
                            clickable 
                            icon={<AccessTimeIcon fontSize="small"/>}
                        />
                        <Chip 
                            label="30d" 
                            size="small" 
                            onClick={() => applyDatePreset(30)} 
                            clickable 
                        />
                         <Chip 
                            label="YTD" 
                            size="small" 
                            onClick={() => applyDatePreset(999)} 
                            clickable 
                        />
                    </Stack>
                 </Box>
                 <Stack direction="row" spacing={2}>
                    <TextField 
                        type="date" 
                        fullWidth 
                        size="small"
                        value={filters.startDate} 
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                    <Typography sx={{ alignSelf: 'center' }}>-</Typography>
                    <TextField 
                        type="date" 
                        fullWidth 
                        size="small"
                        value={filters.endDate} 
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                 </Stack>
               </Stack>
            </Grid>
            
            {/* Footer Actions */}
            <Grid size={{ xs: 12 }} display="flex" justifyContent="flex-end">
                <Button 
                    variant="text" 
                    color="inherit" 
                    onClick={handleClear} 
                    disabled={activeFilterCount === 0}
                >
                    Clear Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
