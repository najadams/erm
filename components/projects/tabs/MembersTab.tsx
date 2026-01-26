import React from 'react';
import { List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

interface Member {
  id: string;
  role: string;
  user: {
      name: string | null;
      email: string;
  }
}

export default function MembersTab({ members }: { members: Member[] }) {
  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {members.map((member) => (
        <ListItem key={member.id} divider>
          <ListItemAvatar>
            <Avatar>
              <PersonIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={member.user.name || member.user.email}
            secondary={member.user.name ? member.user.email : null}
          />
           <Chip label={member.role} size="small" variant="outlined" />
        </ListItem>
      ))}
    </List>
  );
}
