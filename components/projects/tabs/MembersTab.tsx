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
    CircularProgress,
    Tabs,
    Tab
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UserAutocomplete from '../UserAutocomplete';
import GroupAutocomplete from '../GroupAutocomplete';

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

interface ProjectGroup {
    id: string; // ProjectGroup ID
    groupId: string;
    role: string;
    group: {
        id: string;
        name: string;
        type: string;
    }
}

interface MembersTabProps {
    members: Member[];
    groups?: ProjectGroup[];
    projectId: string;
    currentUser?: { id: string; role?: string; } | null;
    onUpdate?: () => void;
}

export default function MembersTab({ members, groups = [], projectId, currentUser, onUpdate }: MembersTabProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [addTab, setAddTab] = useState(0); // 0 = User, 1 = Group

  const [newUser, setNewUser] = useState<any>(null);
  const [newGroup, setNewGroup] = useState<any>(null);
  const [newRole, setNewRole] = useState('CONTRIBUTOR');
  
  const [loading, setLoading] = useState(false);

  // Derive permissions
  const currentMemberRec = members.find(m => m.user.id === currentUser?.id);
  const canManage = currentMemberRec?.role === 'MANAGER'; // Or owner

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: Member) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMember(member);
    setSelectedGroup(null);
  };

  const handleGroupMenuOpen = (event: React.MouseEvent<HTMLElement>, group: ProjectGroup) => {
    setMenuAnchor(event.currentTarget);
    setSelectedGroup(group);
    setSelectedMember(null);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMember(null);
    setSelectedGroup(null);
  };

  const handleAddMember = async () => {
      setLoading(true);
      try {
          if (addTab === 0) {
              if (!newUser) return;
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
          } else {
              if (!newGroup) return;
               const res = await fetch(`/api/projects/${projectId}/groups`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ groupId: newGroup.id, role: newRole })
              });
              if (res.ok) {
                  setOpenAdd(false);
                  setNewGroup(null);
                  if (onUpdate) onUpdate();
              } else {
                  const data = await res.json();
                  alert(data.error || 'Failed to add group');
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleChangeRole = async (role: string) => {
      setLoading(true);
      try {
          if (selectedMember) {
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
          } else if (selectedGroup) {
             const res = await fetch(`/api/projects/${projectId}/groups`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: selectedGroup.group.id, role })
            });
            if (res.ok) {
                handleMenuClose();
                if (onUpdate) onUpdate();
            } else {
                alert('Failed to update role');
            }
          }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  const handleDelete = async () => {
      if (!confirm('Remove this member/group?')) return;
      setLoading(true);
      try {
          if (selectedMember) {
            const res = await fetch(`/api/projects/${projectId}/members?memberId=${selectedMember.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                handleMenuClose();
                if (onUpdate) onUpdate();
            } else {
                alert('Failed to remove member');
            }
          } else if (selectedGroup) {
             const res = await fetch(`/api/projects/${projectId}/groups?groupId=${selectedGroup.group.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                handleMenuClose();
                if (onUpdate) onUpdate();
            } else {
                alert('Failed to remove group');
            }
          }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  return (
    <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Project Team</Typography>
            <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setOpenAdd(true)}>
                Add Member
            </Button>
        </Box>

        <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #eee' }}>
        
        {/* Groups Section */}
        {groups.map((g) => (
             <ListItem 
                key={g.id} 
                divider 
                secondaryAction={
                    <IconButton edge="end" onClick={(e) => handleGroupMenuOpen(e, g)}>
                        <MoreVertIcon />
                    </IconButton>
                }
            >
            <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <GroupIcon />
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={g.group.name}
                secondary={`Group • ${g.group.type}`}
            />
            <Chip 
                label={g.role} 
                size="small" 
                color={g.role === 'MANAGER' ? 'secondary' : 'default'} 
                variant="outlined" 
                sx={{ mr: 2 }}
            />
            </ListItem>
        ))}

        {/* Users Section */}
        {members.map((member) => (
            <ListItem 
                key={member.id} 
                divider 
                secondaryAction={
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
        
        {members.length === 0 && groups.length === 0 && (
            <ListItem>
                <ListItemText primary="No members yet" sx={{ textAlign: 'center', color: 'text.secondary' }} />
            </ListItem>
        )}
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
            <DialogContent sx={{ pt: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={addTab} onChange={(e, v) => setAddTab(v)} variant="fullWidth">
                        <Tab label="User" />
                        <Tab label="Group" />
                    </Tabs>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    {addTab === 0 ? (
                        <UserAutocomplete 
                            value={newUser}
                            onChange={setNewUser}
                            label="Find User by Name/Email"
                        />
                    ) : (
                        <GroupAutocomplete
                            value={newGroup}
                            onChange={setNewGroup}
                            label="Find Group"
                        />
                    )}
                    
                    <FormControl fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={newRole}
                            label="Role"
                            onChange={(e) => setNewRole(e.target.value)}
                            native 
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
                <Button onClick={handleAddMember} variant="contained" disabled={(!newUser && !newGroup) || loading}>
                    {loading ? 'Adding...' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
}
