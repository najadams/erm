'use client';

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface SelectedRecord {
  id: string;
  title: string;
  referenceNumber?: string;
}

interface SkippedRecord {
  recordId: string;
  title?: string;
  reason: 'ALREADY_HAS_ACCESS' | 'PENDING_REQUEST' | 'COOLDOWN_ACTIVE' | 'NOT_FOUND';
}

interface BatchAccessRequestDialogProps {
  open: boolean;
  onClose: () => void;
  selectedRecords: SelectedRecord[];
  onRemoveRecord: (recordId: string) => void;
  onSuccess: () => void;
}

const reasonLabels: Record<string, string> = {
  ALREADY_HAS_ACCESS: 'Already have access',
  PENDING_REQUEST: 'Request already pending',
  COOLDOWN_ACTIVE: 'Recently rejected (7-day cooldown)',
  NOT_FOUND: 'Record not found'
};

export default function BatchAccessRequestDialog({
  open,
  onClose,
  selectedRecords,
  onRemoveRecord,
  onSuccess
}: BatchAccessRequestDialogProps) {
  const [reason, setReason] = useState('');
  const [requestedLevel, setRequestedLevel] = useState('VIEW');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: SkippedRecord[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for your request');
      return;
    }

    if (selectedRecords.length === 0) {
      setError('No records selected');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/batch-access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordIds: selectedRecords.map(r => r.id),
          reason: reason.trim(),
          requestedLevel
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit request');
        return;
      }

      setResult({
        created: data.created.length,
        skipped: data.skipped
      });

      if (data.created.length > 0) {
        // Show result for a moment, then close
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (err) {
      setError('An error occurred while submitting your request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setRequestedLevel('VIEW');
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Request Access to {selectedRecords.length} Record{selectedRecords.length !== 1 ? 's' : ''}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Selected Records List */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Selected Records
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 150, overflow: 'auto', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              {selectedRecords.map((record) => (
                <Chip
                  key={record.id}
                  label={record.referenceNumber || record.title}
                  onDelete={() => onRemoveRecord(record.id)}
                  size="small"
                  variant="outlined"
                />
              ))}
              {selectedRecords.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No records selected
                </Typography>
              )}
            </Box>
          </Box>

          {/* Access Level */}
          <FormControl fullWidth size="small">
            <InputLabel>Requested Access Level</InputLabel>
            <Select
              value={requestedLevel}
              label="Requested Access Level"
              onChange={(e) => setRequestedLevel(e.target.value)}
              disabled={submitting || result !== null}
            >
              <MenuItem value="VIEW">VIEW - Read and download</MenuItem>
              <MenuItem value="COMMENT">COMMENT - View and add comments</MenuItem>
              <MenuItem value="EDIT_METADATA">EDIT METADATA - Modify metadata</MenuItem>
              <MenuItem value="EDIT_CONTENT">EDIT CONTENT - Modify content/files</MenuItem>
            </Select>
          </FormControl>

          {/* Reason */}
          <TextField
            label="Reason for Request"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need access to these records..."
            disabled={submitting || result !== null}
            required
          />

          {/* Error Message */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Result */}
          {result && (
            <Box>
              {result.created > 0 && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  Successfully submitted {result.created} access request{result.created !== 1 ? 's' : ''}
                </Alert>
              )}

              {result.skipped.length > 0 && (
                <Alert severity="warning">
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {result.skipped.length} record{result.skipped.length !== 1 ? 's were' : ' was'} skipped:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {result.skipped.map((skip) => (
                      <li key={skip.recordId}>
                        <Typography variant="body2">
                          {skip.title || skip.recordId}: {reasonLabels[skip.reason] || skip.reason}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || selectedRecords.length === 0 || !reason.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
