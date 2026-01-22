'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import debounce from 'lodash/debounce';

interface ClassificationNode {
    id: string;
    name: string;
    code?: string;
    level: number;
    parent?: {
        id: string;
        name: string;
        code?: string;
        parent?: {
            id: string;
            name: string;
            code?: string;
        }
    };
}

interface ClassificationSelectProps {
  value: string | null | string[];
  onChange: (value: string | string[] | null) => void;
  label?: string;
  multiple?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
}

export default function ClassificationSelect({ 
  value, 
  onChange, 
  label = "Classification (Record Type)", 
  multiple = false,
  error = false,
  helperText,
  required = false
}: ClassificationSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ClassificationNode[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Cache all options if possible, or search?
  // User asked for "Record Types", likely < 100-200. Fetching all Level 3 is safe.
  
  useEffect(() => {
    let active = true;

    if (!open) {
      return undefined;
    }

    if (options.length > 0) return; // Already loaded

    setLoading(true);

    (async () => {
        try {
            // Fetch Level 3 nodes (Record Types)
            const res = await fetch('/api/classifications?level=3');
            if (res.ok) {
                const data = await res.json();
                if (active) {
                    setOptions(data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch classifications', err);
        } finally {
            if (active) setLoading(false);
        }
    })();

    return () => {
      active = false;
    };
  }, [open, options.length]);

  const getOptionLabel = (option: ClassificationNode) => {
      // Build path: L1 > L2 > L3
      const parts = [];
      if (option.parent?.parent) parts.push(option.parent.parent.name);
      if (option.parent) parts.push(option.parent.name);
      parts.push(option.name);
      return parts.join(' > ');
  };

  const getOptionSelected = (option: ClassificationNode, val: any) => {
      return option.id === val.id || option.id === val;
  };

  // Convert value ID(s) to Option object(s) for Autocomplete display
  // This is tricky if options aren't loaded yet.
  // We might need to fetch the specific selected values if not in options.
  // For now, let's assume options load quickly or we rely on options check.
  // Actually, Autocomplete needs value to be the object or matches getOptionSelected.
  
  // If value is a string ID, we need to find it in options.
  const selectedValue = useMemo(() => {
      if (!value) return multiple ? [] : null;
      if (multiple) {
          return options.filter(o => (value as string[]).includes(o.id));
      }
      return options.find(o => o.id === value) || null;
  }, [value, options, multiple]);

  return (
    <Autocomplete
      multiple={multiple}
      id="classification-select"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === (value.id || value)}
      getOptionLabel={getOptionLabel}
      options={options}
      loading={loading}
      value={selectedValue}
      onChange={(event, newValue) => {
          if (multiple) {
              onChange((newValue as ClassificationNode[]).map(n => n.id));
          } else {
              onChange((newValue as ClassificationNode)?.id || null);
          }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
          // Extract key to avoid spreading it (MUI/React warning fix)
          const { key, ...otherProps } = props as any;
          
          // Custom rendering to show hierarchy nicely
          const l1 = option.parent?.parent?.name;
          const l2 = option.parent?.name;
          const l3 = option.name;
          
          return (
            <li key={key} {...otherProps}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body1">{l3}</Typography>
                    {(l1 || l2) && (
                        <Typography variant="caption" color="text.secondary">
                            {l1 ? `${l1} > ` : ''}{l2}
                        </Typography>
                    )}
                </Box>
            </li>
          );
      }}
    />
  );
}
