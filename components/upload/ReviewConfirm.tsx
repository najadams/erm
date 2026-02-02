'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Grid from '@mui/material/Grid';

interface ReviewConfirmProps {
  data: {
    file: File | null;
    metadata: any;
    access: any;
    compliance: any;
    versionInfo?: any;
  };
  onCancel: () => void;
  onUpload: () => void;
  uploading: boolean;
}

export default function ReviewConfirm({ data, onCancel, onUpload, uploading }: ReviewConfirmProps) {
  const { file, metadata, access, compliance, versionInfo } = data;

  const missingFields = [];
  if (!metadata.title) missingFields.push('Title');
  if (!metadata.classificationNodeId && !metadata.type) missingFields.push('Classification/Type');
  // Check required dynamic fields
  // This logic ideally belongs in parent, but we can do a simple check if template passed
  
  const isValid = missingFields.length === 0 && !!file;

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 10, bgcolor: 'background.default' }}>
      
      {/* Validation Warning */}
      {!isValid && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1 }}>
              <Typography color="warning.main" variant="body2">
                  <strong>Missing Required Fields:</strong> {missingFields.join(', ')}
              </Typography>
          </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
            <List dense>
                <ListItem>
                    <ListItemText primary="Document" secondary={file?.name || 'No file selected'} />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Type" secondary={metadata.type || 'Not Selected'} />
                </ListItem>
                <ListItem>
                     <ListItemText primary="Department" secondary={metadata.department || 'None'} />
                </ListItem>
                <ListItem>
                     <ListItemText primary="Version" secondary={versionInfo?.isNewVersion ? `v${versionInfo.version} (New Version)` : 'New Document'} />
                </ListItem>
            </List>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
            <List dense>
                <ListItem>
                    <ListItemText primary="Access" secondary={
                        access.shareWithAll ? 'All GIPC Staff' :
                        (access.sharedUsers.length > 0 || access.sharedGroups.length > 0)
                            ? `${access.sharedUsers.length} Users, ${access.sharedGroups.length} Groups`
                            : 'Private (Owner + Admins)'
                    } />
                </ListItem>
                <ListItem>
                    <ListItemText
                        primary="Sharing"
                        secondary={
                            (access.sharedUsers.length > 0 || access.sharedGroups.length > 0)
                                ? `${access.sharedUsers.length} Users, ${access.sharedGroups.length} Groups`
                                : 'None'
                        }
                    />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Retention" secondary={metadata.retentionPeriod || 'None'} />
                </ListItem>
                <ListItem>
                    <ListItemText 
                        primary="Compliance" 
                        secondary={
                            [
                                compliance.isLegalHold ? 'Legal Hold' : null, 
                                compliance.requiresApproval ? 'Approval Required' : null
                            ].filter(Boolean).join(', ') || 'None'
                        } 
                    />
                </ListItem>
            </List>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={onCancel} disabled={uploading}>
            Cancel
        </Button>
        <Button variant="contained" onClick={onUpload} disabled={uploading || !isValid}>
            {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </Box>
    </Paper>
  );
}
