import React, { useState, useEffect, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import debounce from 'lodash/debounce';

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface UserAutocompleteProps {
  value: UserOption | null;
  onChange: (value: UserOption | null) => void;
  label?: string;
}

export default function UserAutocomplete({ value, onChange, label = "Search Users" }: UserAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const fetchUsers = useMemo(
    () =>
      debounce(async (request: { input: string }, callback: (results?: readonly UserOption[]) => void) => {
        try {
          const params = new URLSearchParams();
          params.append('q', request.input);
          const response = await fetch(`/api/users?${params.toString()}`);
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          callback(data);
        } catch (error) {
          console.error("Search error", error);
          callback([]);
        }
      }, 400),
    [],
  );

  useEffect(() => {
    let active = true;

    if (inputValue === '') {
      setOptions(value ? [value] : []);
      return undefined;
    }

    setLoading(true);

    fetchUsers({ input: inputValue }, (results?: readonly UserOption[]) => {
      if (active) {
        let newOptions: readonly UserOption[] = [];
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
  }, [value, inputValue, fetchUsers]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => option.name || option.email}
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
            <Box>
                <Typography variant="body1">
                    {option.name || 'Unnamed'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {option.email}
                </Typography>
            </Box>
          </li>
        );
      }}
    />
  );
}
