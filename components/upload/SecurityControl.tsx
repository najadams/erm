'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Chip from '@mui/material/Chip';

// Matches Prisma schema enums
const CLASSIFICATIONS = [
  { value: 'OFFICIAL', label: 'Official', color: 'success' as const, description: 'General business information' },
  { value: 'OFFICIAL_CONFIDENTIAL', label: 'Official-Confidential', color: 'info' as const, description: 'Internal use, limited distribution' },
  { value: 'RESTRICTED', label: 'Restricted', color: 'warning' as const, description: 'Sensitive information, need-to-know basis' },
  { value: 'SECRET', label: 'Secret', color: 'error' as const, description: 'Highly sensitive, authorized personnel only' },
];

const SENSITIVITIES = [
  { value: 'LOW', label: 'Low', color: 'success' as const, description: 'Minimal impact if disclosed' },
  { value: 'MODERATE', label: 'Moderate', color: 'info' as const, description: 'Some impact if disclosed' },
  { value: 'HIGH', label: 'High', color: 'warning' as const, description: 'Significant impact if disclosed' },
  { value: 'CRITICAL', label: 'Critical', color: 'error' as const, description: 'Severe impact if disclosed' },
];

interface SecurityControlProps {
  data: {
    classification: string;
    sensitivity: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function SecurityControl({ data, onChange }: SecurityControlProps) {
  const selectedClassification = CLASSIFICATIONS.find(c => c.value === data.classification);
  const selectedSensitivity = SENSITIVITIES.find(s => s.value === data.sensitivity);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>Security Classification</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Assign the appropriate security level based on the document content and Ghana government classification guidelines.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Classification */}
        <Box sx={{ flex: '1 1 280px' }}>
          <FormControl fullWidth>
            <InputLabel>Classification Level</InputLabel>
            <Select
              value={data.classification}
              label="Classification Level"
              onChange={(e) => onChange('classification', e.target.value)}
            >
              {CLASSIFICATIONS.map((cls) => (
                <MenuItem key={cls.value} value={cls.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={cls.label} size="small" color={cls.color} sx={{ minWidth: 140 }} />
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {selectedClassification?.description}
            </FormHelperText>
          </FormControl>
        </Box>

        {/* Sensitivity */}
        <Box sx={{ flex: '1 1 280px' }}>
          <FormControl fullWidth>
            <InputLabel>Sensitivity Level</InputLabel>
            <Select
              value={data.sensitivity}
              label="Sensitivity Level"
              onChange={(e) => onChange('sensitivity', e.target.value)}
            >
              {SENSITIVITIES.map((sens) => (
                <MenuItem key={sens.value} value={sens.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={sens.label} size="small" color={sens.color} sx={{ minWidth: 100 }} />
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {selectedSensitivity?.description}
            </FormHelperText>
          </FormControl>
        </Box>
      </Box>
    </Paper>
  );
}
