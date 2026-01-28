'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';

interface ComplianceControlProps {
  data: {
    isLegalHold: boolean;
  };
  onChange: (field: string, value: boolean) => void;
  isAdmin?: boolean;
}

export default function ComplianceControl({ data, onChange, isAdmin = false }: ComplianceControlProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>Compliance & Control</Typography>

      {isAdmin ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={data.isLegalHold}
                onChange={(e) => onChange('isLegalHold', e.target.checked)}
                color="error"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="500">Place under Legal Hold</Typography>
                <Typography variant="caption" color="text.secondary">
                  Prevents deletion and modification. Use for litigation or regulatory requirements.
                </Typography>
              </Box>
            }
          />
          {data.isLegalHold && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Legal Hold will be applied immediately upon upload. This action is logged and audited.
            </Alert>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Compliance controls are managed by administrators and records officers.
          Documents are automatically subject to retention policies based on their classification.
        </Typography>
      )}
    </Paper>
  );
}
