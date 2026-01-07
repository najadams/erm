'use client';

import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import debounce from 'lodash/debounce';

interface DocumentMetadataProps {
  data: any; // Legacy or flexible
  onChange: (field: string, value: any) => void;
  versionInfo?: { isNewVersion: boolean; version: number };
  
  // New Props
  template?: any;
  dynamicValues?: any;
  onDynamicChange?: (fieldId: string, value: any) => void;
}

const DOCUMENT_TYPES = ['HR Document', 'Contract', 'Invoice', 'Policy', 'Report', 'Other'];

// Import DynamicField
import DynamicField from './DynamicField';

export default function DocumentMetadata({ 
  data, 
  onChange, 
  versionInfo,
  template,
  dynamicValues = {},
  onDynamicChange
}: DocumentMetadataProps) {
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
                    value={data.type || ''}
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



            {/* Parent Record Selection */}
            <Grid size={{ xs: 12 }}>
                 <ParentRecordSelect 
                    value={data.parentId}
                    onChange={(val) => onChange('parentId', val)}
                 />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary', textTransform: 'uppercase' }}>
                    Metadata
                </Typography>
            </Grid>

            {/* Dynamic Rendering */}
            {template && template.templateFields ? (
                template.templateFields
                    .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                    .map((tf: any) => {
                         const field = tf.metadataField;
                         return (
                            <Grid size={{ xs: 12, md: 6 }} key={tf.id}>
                                <DynamicField
                                    field={field}
                                    value={dynamicValues[field.id]}
                                    onChange={(val) => onDynamicChange && onDynamicChange(field.id, val)}
                                    error={tf.required && !dynamicValues[field.id]}
                                    disabled={!tf.editable}
                                />
                            </Grid>
                         );
                    })
            ) : (
                /* Fallback / Legacy Static Fields */
                <React.Fragment>
                     <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label="Department"
                            fullWidth
                            value={data.department || ''}
                            onChange={(e) => onChange('department', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                         <TextField
                            label="Retention Period"
                            fullWidth
                            value={data.retentionPeriod || ''}
                            onChange={(e) => onChange('retentionPeriod', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            type="date"
                            label="Effective Date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={data.effectiveDate || ''}
                            onChange={(e) => onChange('effectiveDate', e.target.value)}
                        />
                    </Grid>
                     <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label="Tags"
                            fullWidth
                            value={data.tags || ''}
                            onChange={(e) => onChange('tags', e.target.value)}
                        />
                    </Grid>
                </React.Fragment>
            )}
        </Grid>
    </Paper>
  );
}

function ParentRecordSelect({ value, onChange }: { value: string | undefined, onChange: (id: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [selectedOption, setSelectedOption] = React.useState<any>(null);

    const fetchRecords = React.useMemo(() => debounce(async (input: string, callback: (results: any[]) => void) => {
        if (input.length < 2) {
            callback([]);
            return;
        }
        try {
            const res = await fetch(`/api/records?q=${encodeURIComponent(input)}`);
            if (res.ok) {
                const data = await res.json();
                callback(data);
            } else {
                callback([]);
            }
        } catch (e) {
            callback([]);
        }
    }, 400), []);

    React.useEffect(() => {
        let active = true;

        if (inputValue === '') {
            setOptions(selectedOption ? [selectedOption] : []);
            return undefined;
        }

        setLoading(true);

        fetchRecords(inputValue, (results) => {
            if (active) {
                let newOptions = [...results];
                setOptions(newOptions);
                setLoading(false);
            }
        });

        return () => { active = false; };
    }, [inputValue, fetchRecords, selectedOption]);

    return (
        <Autocomplete
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => `${option.referenceNumber || 'No Ref'} - ${option.title}`}
            options={options}
            loading={loading}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue: any) => {
                setOptions(newValue ? [newValue, ...options] : options);
                setSelectedOption(newValue);
                onChange(newValue ? newValue.id : '');
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Link to Parent Record (Optional)"
                    helperText="Search by title or reference number to link this upload to an existing case or file."
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
        />
    );
}
