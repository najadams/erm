import React from 'react';
import { Card, CardContent, Typography, GridLegacy as Grid, Divider } from '@mui/material';

interface RegisteredCompany {
  name: string;
  registrationNumber: string;
  investorType: string;
  sector?: string;
  tin?: string;
  contactDetails?: string; // JSON
}

export default function CompanyTab({ company }: { company: RegisteredCompany | null }) {
  if (!company) {
      return (
          <Typography variant="body1" color="text.secondary">No company linked to this project.</Typography>
      );
  }

  let contact = {};
  try {
      if (company.contactDetails) {
          contact = JSON.parse(company.contactDetails);
      }
  } catch (e) {}

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>{company.name}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Reg No: {company.registrationNumber}
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
                 <Typography variant="caption" color="text.secondary">Investor Type</Typography>
                 <Typography variant="body1" gutterBottom>{company.investorType}</Typography>
                 
                 <Typography variant="caption" color="text.secondary">TIN</Typography>
                 <Typography variant="body1" gutterBottom>{company.tin || 'N/A'}</Typography>
            </Grid>
             <Grid item xs={12} md={6}>
                 <Typography variant="caption" color="text.secondary">Core Sector</Typography>
                 <Typography variant="body1" gutterBottom>{company.sector || 'N/A'}</Typography>
                 
                 <Typography variant="caption" color="text.secondary">Contact Info</Typography>
                 <pre className="text-sm bg-gray-50 p-2 rounded mt-1 overflow-auto">
                     {JSON.stringify(contact, null, 2)}
                 </pre>
            </Grid>
        </Grid>

      </CardContent>
    </Card>
  );
}
