import React, { useState, useEffect, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import debounce from 'lodash/debounce'; // Assuming lodash is likely available or I can write my own

interface RecordOption {
  id: string;
  title: string;
  referenceNumber: string | null;
}

interface RecordAutocompleteProps {
  value: RecordOption | null;
  onChange: (value: RecordOption | null) => void;
  label?: string;
}

export default function RecordAutocomplete({ value, onChange, label = "Link to Parent Record (Optional)" }: RecordAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly RecordOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const fetchRecords = useMemo(
    () =>
      debounce(async (request: { input: string }, callback: (results?: readonly RecordOption[]) => void) => {
        try {
          const params = new URLSearchParams();
          params.append('q', request.input);
          const response = await fetch(`/api/records/search?${params.toString()}`);
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

    fetchRecords({ input: inputValue }, (results?: readonly RecordOption[]) => {
      if (active) {
        let newOptions: readonly RecordOption[] = [];
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
  }, [value, inputValue, fetchRecords]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => {
        const ref = option.referenceNumber ? `[${option.referenceNumber}] ` : '';
        return `${ref}${option.title}`;
      }}
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
                    {option.title}
                </Typography>
                {option.referenceNumber && (
                    <Typography variant="caption" color="text.secondary">
                        Ref: {option.referenceNumber}
                    </Typography>
                )}
            </Box>
          </li>
        );
      }}
    />
  );
}
