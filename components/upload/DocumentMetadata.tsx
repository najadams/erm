'use client';

import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

interface DocumentMetadataProps {
  data: {
    type: string;
    title: string;
    department: string;
    tags: string;
    category: string;
    effectiveDate: string;
    retentionPeriod: string;
  };
  onChange: (field: string, value: string) => void;
  versionInfo?: { isNewVersion: boolean; version: number };
}

const DOCUMENT_TYPES = ['HR Document', 'Contract', 'Invoice', 'Policy', 'Report', 'Other'];
const DEPARTMENTS = ['HR', 'Finance', 'Legal', 'Operations', 'Engineering', 'Marketing'];

export default function DocumentMetadata({ data, onChange, versionInfo }: DocumentMetadataProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>Document Context</Typography>
        
        {versionInfo?.isNewVersion && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main', borderRadius: 1 }}>
                <Typography color="info.main" fontWeight="500">
                    This document already exists. Uploading as new version (v{versionInfo.version}).
                </Typography>
            </Box>
        )}

        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    select
                    label="Document Type"
                    fullWidth
                    value={data.type}
                    onChange={(e) => onChange('type', e.target.value)}
                >
                    {DOCUMENT_TYPES.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    label="Document Title"
                    fullWidth
                    value={data.title}
                    onChange={(e) => onChange('title', e.target.value)}
                    helperText="Used to group versions"
                />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary', textTransform: 'uppercase' }}>
                    Metadata
                </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    select
                    label="Department"
                    fullWidth
                    value={data.department}
                    onChange={(e) => onChange('department', e.target.value)}
                >
                    {DEPARTMENTS.map(dept => (
                        <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                 <TextField
                    label="Retention Period"
                    fullWidth
                    placeholder="e.g. 7 years"
                    value={data.retentionPeriod}
                    onChange={(e) => onChange('retentionPeriod', e.target.value)}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    type="date"
                    label="Effective Date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={data.effectiveDate}
                    onChange={(e) => onChange('effectiveDate', e.target.value)}
                />
            </Grid>
             <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    label="Tags"
                    fullWidth
                    placeholder="comma, separated, tags"
                    value={data.tags}
                    onChange={(e) => onChange('tags', e.target.value)}
                />
            </Grid>
        </Grid>
    </Paper>
  );
}
