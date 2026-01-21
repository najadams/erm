'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

export interface Record {
    id: string;
    title: string;
    referenceNumber: string;
    status: string;
    versionNumber: number;
    classificationNode?: {
        name: string;
        code: string;
    };
    isLatest: boolean;
}

interface VersioningControlProps {
    isVersionMode: boolean;
    onVersionModeChange: (checked: boolean) => void;
    linkedRecord: Record | null;
    onLinkedRecordChange: (record: Record | null) => void;
    classificationNodeId?: string;
}

export default function VersioningControl({
    isVersionMode,
    onVersionModeChange,
    linkedRecord,
    onLinkedRecordChange,
    classificationNodeId
}: VersioningControlProps) {
    const [recordSearchQuery, setRecordSearchQuery] = useState('');
    const [recordOptions, setRecordOptions] = useState<Record[]>([]);
    const [searchingRecords, setSearchingRecords] = useState(false);

    // Search Effect
    useEffect(() => {
        if (!isVersionMode || recordSearchQuery.length < 2) {
            setRecordOptions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchingRecords(true);
            try {
                // Construct Search URL
                let url = `/api/records/search?q=${encodeURIComponent(recordSearchQuery)}`;
                
                // Filter by classification if selected
                if (classificationNodeId) {
                    url += `&classificationNodeId=${classificationNodeId}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setRecordOptions(data);
                }
            } catch (e) {
                console.error('Search failed', e);
            } finally {
                setSearchingRecords(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [recordSearchQuery, isVersionMode, classificationNodeId]);

    return (
        <React.Fragment>
            <Typography variant="h6" gutterBottom>0. Version Control</Typography>
            <Box sx={{ mb: 4, p: 3, border: '1px solid #ccc', borderRadius: 2, bgcolor: '#f5f5f5' }}>
                <FormControlLabel 
                    control={
                        <Switch 
                            checked={isVersionMode} 
                            onChange={(e) => onVersionModeChange(e.target.checked)} 
                            color="primary"
                        />
                    } 
                    label={<Typography fontWeight="bold" color="text.primary">Is this a new version of an existing record?</Typography>} 
                />
                
                {isVersionMode && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
                        <Autocomplete
                            value={linkedRecord}
                            options={recordOptions}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return `${option.referenceNumber || 'No Ref'} - ${option.title}`;
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            filterOptions={(x) => x} 
                            loading={searchingRecords}
                            onInputChange={(_, val) => setRecordSearchQuery(val)}
                            onChange={(_, newVal) => onLinkedRecordChange(newVal)}
                            renderInput={(params) => (
                                <TextField 
                                    {...params} 
                                    label="Search original record to link..." 
                                    placeholder="Type title or reference number (e.g. INV)"
                                    helperText={classificationNodeId ? "Searching within selected classification..." : "Searching all records..."}
                                    fullWidth
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Box sx={{ width: '100%' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle2" component="span" fontWeight="bold">
                                              {option.referenceNumber}
                                            </Typography>
                                            <Chip 
                                              size="small" 
                                              label={`v${option.versionNumber}`} 
                                              color={option.isLatest ? "primary" : "default"} 
                                              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                                            />
                                        </Box>
                                        <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
                                          {option.title}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                        />
                        {linkedRecord && (
                            <Box sx={{ mt: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #1976d2' }}>
                                <Typography variant="body2" color="primary" fontWeight="bold">
                                    ✓ Will create new version for:
                                </Typography>
                                <Typography variant="body2">
                                    {linkedRecord.title} (v{linkedRecord.versionNumber} → v{linkedRecord.versionNumber + 1})
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </React.Fragment>
    );
}
