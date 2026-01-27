import React, { useState } from 'react';
import { 
    Box, 
    Stepper, 
    Step, 
    StepLabel, 
    Button, 
    Typography, 
    Paper,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ArchiveIcon from '@mui/icons-material/Archive';
import UndoIcon from '@mui/icons-material/Undo';

interface ProjectWorkflowProps {
    project: {
        id: string;
        status: string;
        members: any[];
        ownerUserId: string;
    };
    currentUser?: { id: string; role?: string; } | null; // Global user
    onStatusChange: () => void;
}

const STEPS = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED'];

export default function ProjectWorkflow({ project, currentUser, onStatusChange }: ProjectWorkflowProps) {
    const [loading, setLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ status: string; label: string } | null>(null);

    // Determine User's Project Role
    const isOwner = project.ownerUserId === currentUser?.id;
    const projectMember = project.members.find((m: any) => m.userId === currentUser?.id);
    const projectRole = projectMember?.role; // CONTRIBUTOR, MANAGER, VIEW_ONLY
    
    // Permission Checks
    const canContribute = isOwner || projectRole === 'MANAGER' || projectRole === 'CONTRIBUTOR';
    const canManage = isOwner || projectRole === 'MANAGER';

    const getActiveStep = (status: string) => {
        const index = STEPS.indexOf(status);
        if (index === -1) {
            if (status === 'ON_HOLD') return STEPS.indexOf('ACTIVE'); // Visualize as Active but paused?
            if (status === 'ARCHIVED') return -1;
        }
        return index;
    };

    const handleTransition = async () => {
        if (!confirmAction) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: confirmAction.status })
            });

            if (res.ok) {
                onStatusChange();
                setConfirmAction(null);
            } else {
                const err = await res.json();
                alert(err.error || 'Transition failed');
            }
        } catch (error) {
            console.error(error);
            alert('Network error');
        } finally {
            setLoading(false);
        }
    };

    const StatusButton = ({ status, label, icon: Icon, color = 'primary', requiredRole = 'CONTRIBUTOR' }: any) => {
        // Simple permission gating
        const authorized = requiredRole === 'MANAGER' ? canManage : canContribute;
        if (!authorized) return null;

        return (
            <Button 
                variant="contained" 
                color={color as any} 
                startIcon={<Icon />}
                onClick={() => setConfirmAction({ status, label })}
                disabled={loading}
                sx={{ mr: 1 }}
            >
                {label}
            </Button>
        );
    };

    // available actions based on status
    const renderActions = () => {
        switch (project.status) {
            case 'DRAFT':
                return (
                    <>
                        <StatusButton status="SUBMITTED" label="Submit for Review" icon={SendIcon} />
                        {canManage && <StatusButton status="ARCHIVED" label="Archive" icon={ArchiveIcon} color="warning" requiredRole="MANAGER" />}
                    </>
                );
            case 'SUBMITTED':
                return (
                    <>
                        <StatusButton status="IN_REVIEW" label="Accept for Review" icon={RateReviewIcon} requiredRole="MANAGER" />
                        <StatusButton status="DRAFT" label="Reject to Draft" icon={UndoIcon} color="error" requiredRole="MANAGER" />
                    </>
                );
            case 'IN_REVIEW':
                return (
                    <>
                        <StatusButton status="APPROVED" label="Approve Project" icon={CheckCircleIcon} color="success" requiredRole="MANAGER" />
                        <StatusButton status="DRAFT" label="Request Changes" icon={UndoIcon} color="warning" requiredRole="MANAGER" />
                    </>
                );
            case 'APPROVED':
                return (
                    <>
                        <StatusButton status="ACTIVE" label="Activate Project" icon={PlayArrowIcon} color="success" requiredRole="MANAGER" />
                        <StatusButton status="ARCHIVED" label="Archive" icon={ArchiveIcon} color="inherit" requiredRole="MANAGER" />
                    </>
                );
            case 'ACTIVE':
                return (
                    <>
                        <StatusButton status="ON_HOLD" label="Put On Hold" icon={PauseIcon} color="warning" requiredRole="MANAGER" />
                        <StatusButton status="COMPLETED" label="Close Project" icon={CheckCircleIcon} requiredRole="MANAGER" />
                    </>
                );
            case 'ON_HOLD':
                return <StatusButton status="ACTIVE" label="Resume Project" icon={PlayArrowIcon} color="success" requiredRole="MANAGER" />;
            case 'COMPLETED':
                return <StatusButton status="ACTIVE" label="Reopen" icon={UndoIcon} requiredRole="MANAGER" />;
            case 'ARCHIVED':
                return <StatusButton status="DRAFT" label="Restore to Draft" icon={UndoIcon} requiredRole="MANAGER" />;
            default:
                return null;
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>Project Status</Typography>
                <Stepper activeStep={getActiveStep(project.status)} alternativeLabel>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label.replace('_', ' ')}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                {project.status === 'ARCHIVED' && <Chip label="ARCHIVED" color="default" />}
                {project.status === 'ON_HOLD' && <Chip label="ON HOLD" color="warning" />}
                
                <Box>
                    {renderActions()}
                </Box>
            </Box>

            {/* Confirmation Dialog */}
            <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)}>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to <strong>{confirmAction?.label}</strong>?
                        This will change the project status to <strong>{confirmAction?.status}</strong>.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button onClick={handleTransition} variant="contained" autoFocus disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
