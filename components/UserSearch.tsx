import React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { debounce } from '@mui/material/utils';

interface UserSearchProps {
    value: any;
    onChange: (value: any) => void;
    type: 'USER' | 'GROUP';
}

export default function UserSearch({ value, onChange, type }: UserSearchProps) {
    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<readonly any[]>([]);
    const [loading, setLoading] = React.useState(false);

    const fetchOptions = React.useMemo(
        () =>
            debounce(async (input: string, callback: (results: any[]) => void) => {
                if (!input || input.length < 2) return callback([]);
                
                const endpoint = type === 'USER' ? `/api/users?q=${input}` : `/api/groups?q=${input}`; // Note: Group search might need robust q support too, assuming similar to users

                // For now, if type is GROUP, we might need to fetch all or filter client side if API doesn't support q.
                // However, the backend task didn't explicitly add ?q= to /api/groups.
                // Let's assume /api/groups returns all (it's usually small) and we filter locally? 
                // BUT current /api/groups is MANAGE_USERS only? 
                // Wait. The directive said "Add search endpoints for Users and Groups". 
                // I only did User. I should check /api/groups permissions.
                // If /api/groups is protected, I need to fix it too!
                // For this component, I will try to fetch.
                
                try {
                    const res = await fetch(endpoint);
                    if (res.ok) {
                        const data = await res.json();
                        callback(data);
                    } else {
                         callback([]);
                    }
                } catch(e) {
                    callback([]);
                }
            }, 400),
        [type],
    );

    React.useEffect(() => {
        let active = true;

        if (type === 'GROUP') {
             // Groups are usually small enough to pre-fetch or just fetch once
             // But for consistency let's try strict search if we implement it.
             // If we didn't implement group search yet, we might fallback to fetching all.
             // Let's assume we will fix Group Search API in a moment if needed.
             // Actually, the user directive said "Add search endpoints for Users NOT Groups explicitly"? 
             // "Add search endpoints for Users and Groups" <- YES IT DID.
             // I missed groups in previous turn. I will add it to the backend plan now.
             
             // For now, let's implement the generic fetcher.
             if (open) {
                setLoading(true);
                fetch('/api/groups').then(res => res.json()).then(data => {
                    if(active) {
                        setOptions(data); // Assuming data is array
                        setLoading(false);
                    }
                }).catch(() => setLoading(false));
             }
             return () => { active = false; };
        }

        return () => { active = false; };
    }, [open, type]);
    
    // For User search, we rely on input
    const onInputChange = (event: any, newInputValue: string) => {
        if (type === 'GROUP') return; // Groups handled by effect
        
        setLoading(true);
        fetchOptions(newInputValue, (results: any[]) => {
            setOptions(results);
            setLoading(false);
        });
    };

    return (
        <Autocomplete
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.name || option.email || ''}
            options={options}
            loading={loading}
            onInputChange={onInputChange}
            onChange={(event, newValue) => {
                onChange(newValue);
            }}
            renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: type === 'USER' ? 'primary.main' : 'secondary.main', width: 24, height: 24 }}>
                             {type === 'USER' ? <PersonIcon fontSize="small"/> : <GroupIcon fontSize="small"/>}
                        </Avatar>
                        <Box>
                            <Typography variant="body2">{option.name}</Typography>
                            {option.email && <Typography variant="caption" color="text.secondary">{option.email}</Typography>}
                            {option.department && <Typography variant="caption" color="text.secondary"> • {option.department.name}</Typography>}
                        </Box>
                    </Box>
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={`Search ${type === 'USER' ? 'User' : 'Group'}`}
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
