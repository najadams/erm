import React, { useState, useEffect, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import debounce from 'lodash/debounce';
import GroupIcon from '@mui/icons-material/Group';

interface GroupOption {
  id: string;
  name: string;
  type: string;
}

interface GroupAutocompleteProps {
  value: GroupOption | null;
  onChange: (value: GroupOption | null) => void;
  label?: string;
}

export default function GroupAutocomplete({ value, onChange, label = "Search Groups" }: GroupAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly GroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const fetchGroups = useMemo(
    () =>
      debounce(async (request: { input: string }, callback: (results?: readonly GroupOption[]) => void) => {
        try {
          const params = new URLSearchParams();
          if (request.input) {
            params.append('q', request.input);
          }
          // Assuming /api/groups supports 'q' for search
          const response = await fetch(`/api/groups?${params.toString()}`);
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          // API might return standard groups list or paginated. Assuming array or { groups: [] }
          // Let's assume it returns array based on standard Next.js CRUD often used here, or check route.ts if needed.
          // Safety check:
          const results = Array.isArray(data) ? data : (data.groups || []);
          callback(results);
        } catch (error) {
          console.error("Search error", error);
          callback([]);
        }
      }, 400),
    [],
  );

  useEffect(() => {
    let active = true;

    // If no input, maybe don't fetch or fetch default? 
    // UserAutocomplete fetches on empty input? Let's check. 
    // UserAutocomplete code: if (inputValue === '') { ... return; }
    // But usually we want to search when typing.
    
    if (inputValue === '' && !open) {
        setOptions(value ? [value] : []);
        return undefined;
    }

    setLoading(true);

    fetchGroups({ input: inputValue }, (results?: readonly GroupOption[]) => {
      if (active) {
        let newOptions: readonly GroupOption[] = [];
        if (value) {
          newOptions = [value];
        }
        if (results) {
          newOptions = [...newOptions, ...results];
        }
        // Deduplicate
        const uniqueOptions = Array.from(new Map(newOptions.map(item => [item.id, item])).values());
        setOptions(uniqueOptions);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [value, inputValue, fetchGroups, open]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => option.name}
      options={options}
      loading={loading}
      value={value}
      onChange={(event, newValue) => {
        onChange(newValue);
      }}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
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
      renderOption={(props, option) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { key, ...otherProps } = props;
        return (
          <li key={key} {...otherProps}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon color="action" />
                <Box>
                    <Typography variant="body1">
                        {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {option.type}
                    </Typography>
                </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}
