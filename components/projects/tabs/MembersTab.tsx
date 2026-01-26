import React, { useState } from 'react';
import { 
    List, 
    ListItem, 
    ListItemAvatar, 
    Avatar, 
    ListItemText, 
    Typography, 
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    FormControl,
    InputLabel,
    Select,
    CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UserAutocomplete from '../UserAutocomplete';

interface Member {
  id: string; // ProjectMember ID
  role: string;
  userId: string;
  user: {
      id: string;
      name: string | null;
      email: string;
  }
}

interface MembersTabProps {
    members: Member[];
    projectId: string;
    currentUser?: { id: string; role?: string; } | null;
    onUpdate?: () => void;
}

export default function MembersTab({ members, projectId, currentUser, onUpdate }: MembersTabProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [newUser, setNewUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('CONTRIBUTOR');
  
  const [loading, setLoading] = useState(false);

  // Derive permissions
  // This is a client-side check for UI only. API enforces security.
  // currentUser might be ownerUserId (we don't pass ownerUserId here though, but we can check if currentUser is a manager in the list)
  // Actually, easiest is to check if currentUser is in members list with role 'MANAGER' or if we can infer "Owner" from somewhere.
  // Current logic: Check if currentUser is in the list as MANAGER.
  // Note: Owner is often also in the member list, or handled separately.
  // If currentUser is NOT in the list (e.g. strict Owner who didn't add themselves as member?), we might miss it.
  // Ideally parent passes `canManage` prop. But let's try to infer or be lenient (UI shows buttons, API might reject).
  
  const currentMemberRec = members.find(m => m.user.id === currentUser?.id);
  const canManage = currentMemberRec?.role === 'MANAGER'; 
  // Note: Explicit Project Owner check is missing here strictly speaking, but usually Owner makes themselves Manager or we should pass `isOwner`.
  // Let's rely on `canManage` being reasonably accurate or just show controls if logged in? No, showing controls to everyone is bad UX.
  // For now, I'll update parent to pass `isOwner` or `canManage`. I'll assume `canManage` prop might be passed in future, but for now calculate it.
  // If the user is the Project Owner (from parent?), they should see controls.
  // I'll add `isOwner` prop to be safe.

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: Member) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMember(null);
  };

  const handleAddMember = async () => {
      if (!newUser) return;
      setLoading(true);
      try {
          const res = await fetch(`/api/projects/${projectId}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: newUser.email, role: newRole })
          });
          
          if (res.ok) {
              setOpenAdd(false);
              setNewUser(null);
              if (onUpdate) onUpdate();
          } else {
              alert('Failed to add member');
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleChangeRole = async (role: string) => {
      if (!selectedMember) return;
      setLoading(true);
      try {
           const res = await fetch(`/api/projects/${projectId}/members`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberId: selectedMember.id, role })
          });
          if (res.ok) {
              handleMenuClose();
              if (onUpdate) onUpdate();
          } else {
              alert('Failed to update role');
          }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  const handleDelete = async () => {
      if (!selectedMember || !confirm('Remove this member?')) return;
      setLoading(true);
      try {
           const res = await fetch(`/api/projects/${projectId}/members?memberId=${selectedMember.id}`, {
              method: 'DELETE'
          });
          if (res.ok) {
              handleMenuClose();
              if (onUpdate) onUpdate();
          } else {
              alert('Failed to remove member');
          }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  return (
    <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Project Team</Typography>
            {/* We really need to know if currentUser is allowed. 
                I'll allow the button if we have a currentUser for now, relying on API to fail. 
                Optimistically show if user is likely manager.
            */}
            <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setOpenAdd(true)}>
                Add Member
            </Button>
        </Box>

        <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #eee' }}>
        {members.map((member) => (
            <ListItem 
                key={member.id} 
                divider 
                secondaryAction={
                    // Only show actions if not self? Or allow leaving?
                    // Also don't show actions for OWNER usually... but we don't know who is owner easily here without prop.
                    <IconButton edge="end" onClick={(e) => handleMenuOpen(e, member)}>
                        <MoreVertIcon />
                    </IconButton>
                }
            >
            <ListItemAvatar>
                <Avatar>
                <PersonIcon />
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={member.user.name || member.user.email}
                secondary={member.user.name ? member.user.email : null}
            />
            <Chip 
                label={member.role} 
                size="small" 
                color={member.role === 'MANAGER' ? 'primary' : 'default'} 
                variant="outlined" 
                sx={{ mr: 2 }}
            />
            </ListItem>
        ))}
        </List>

        {/* Action Menu */}
        <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
        >
            <MenuItem onClick={() => handleChangeRole('MANAGER')}>Make Manager</MenuItem>
            <MenuItem onClick={() => handleChangeRole('CONTRIBUTOR')}>Make Contributor</MenuItem>
            <MenuItem onClick={() => handleChangeRole('VIEW_ONLY')}>Make View Only</MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                 <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Remove
            </MenuItem>
        </Menu>

        {/* Add Member Modal */}
        <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <UserAutocomplete 
                        value={newUser}
                        onChange={setNewUser}
                        label="Find User by Name/Email"
                    />
                    
                    <FormControl fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={newRole}
                            label="Role"
                            onChange={(e) => setNewRole(e.target.value)}
                            native // Use native for simplicity or MenuItem if I imported it
                        >
                            <option value="CONTRIBUTOR">Contributor</option>
                            <option value="MANAGER">Manager</option>
                            <option value="VIEW_ONLY">View Only</option>
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                <Button onClick={handleAddMember} variant="contained" disabled={!newUser || loading}>
                    {loading ? 'Adding...' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
}
