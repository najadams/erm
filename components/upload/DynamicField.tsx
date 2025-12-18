'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

interface DynamicFieldProps {
  field: {
    id: string;
    name: string;
    label: string;
    dataType: string;
    required: boolean;
    enumValues?: string | null; // JSON string
  };
  value: any;
  onChange: (value: any) => void;
  error?: boolean;
  disabled?: boolean;
}

export default function DynamicField({ field, value, onChange, error, disabled }: DynamicFieldProps) {
  const { label, dataType, required, enumValues } = field;

  // Handle Enum / Select
  if (dataType === 'enum' && enumValues) {
    let options: string[] = [];
    try {
      options = JSON.parse(enumValues);
    } catch (e) {
      console.error('Failed to parse enum values', e);
    }
    
    return (
      <TextField
        select
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        fullWidth
        error={error}
        disabled={disabled}
        helperText={error ? 'Required' : ''}
      >
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  // Handle Boolean
  if (dataType === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Checkbox 
            checked={Boolean(value)} 
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label={label}
      />
    );
  }

  // Handle Date
  if (dataType === 'date') {
    return (
      <TextField
        type="date"
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        fullWidth
        InputLabelProps={{ shrink: true }}
        error={error}
        disabled={disabled}
        helperText={error ? 'Required' : ''}
      />
    );
  }

  // Handle Multiselect
  if (dataType === 'multiselect' && enumValues) {
    let options: string[] = [];
    try {
        options = JSON.parse(enumValues);
    } catch (e) {
        console.error('Failed to parse multiselect values', e);
    }
    
    // Ensure value is an array
    const selectedValues = Array.isArray(value) ? value : [];

    return (
        <TextField
            select
            label={label}
            value={selectedValues}
            onChange={(e) => onChange(e.target.value)} // MUI Select multiple returns array
            required={required}
            fullWidth
            error={error}
            disabled={disabled}
            helperText={error ? 'Required' : ''}
            SelectProps={{
                multiple: true,
                renderValue: (selected) => {
                     const selectedArray = selected as string[];
                     return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedArray.map((val) => (
                                <Chip key={val} label={val} size="small" />
                            ))}
                        </Box>
                     )
                }
            }}
        >
            {options.map((opt) => (
                <MenuItem key={opt} value={opt}>
                    {opt}
                </MenuItem>
            ))}
        </TextField>
    );
  }

  // Handle User (Basic Text Fallback for now, could be improved with User Select)
  if (dataType === 'user') {
      return (
          <TextField
            label={label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            fullWidth
            helperText="Enter user email or ID"
            error={error}
            disabled={disabled}
          />
      );
  }

  // Handle Number
  if (dataType === 'number') {
    return (
      <TextField
        type="number"
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        fullWidth
        error={error}
        disabled={disabled}
        helperText={error ? 'Required' : ''}
      />
    );
  }

  // Default: Text
  return (
    <TextField
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      fullWidth
      multiline={dataType === 'longtext'}
      rows={dataType === 'longtext' ? 3 : 1}
      error={error}
      disabled={disabled}
      helperText={error ? 'Required' : ''}
    />
  );
}
