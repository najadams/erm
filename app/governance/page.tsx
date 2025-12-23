'use client';

import React from 'react';
import { Box, Typography, Container, Card, CardContent, CardActionArea } from '@mui/material';
import { useRouter } from 'next/navigation';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GavelIcon from '@mui/icons-material/Gavel';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

export default function GovernancePage() {
  const router = useRouter();

  const MENU_ITEMS = [
    {
      title: 'Retention Schedules',
      description: 'Manage document lifecycles and retention policies.',
      icon: <AccessTimeIcon fontSize="large" color="primary" />,
      href: '/governance/retention'
    },
    {
      title: 'Legal Holds',
      description: 'Freeze records against destruction for legal cases.',
      icon: <GavelIcon fontSize="large" color="error" />,
      href: '/governance/legal-holds'
    },
    {
      title: 'Disposition Queue',
      description: 'Review and approve expired records for destruction.',
      icon: <DeleteSweepIcon fontSize="large" color="warning" />,
      href: '/governance/disposition'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#1e293b' }}>
        Governance & Compliance
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Control the lifecycle of your information assets.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MENU_ITEMS.map((item) => (
          <Box key={item.title} sx={{ width: { xs: '100%', md: 'calc(33.33% - 22px)' } }}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => router.push(item.href)} sx={{ height: '100%', p: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Box sx={{ mb: 2, p: 2, bgcolor: '#f1f5f9', borderRadius: '50%' }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
