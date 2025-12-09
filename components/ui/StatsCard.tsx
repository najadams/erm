'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

export default function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', p: 2 }}>
      <Box sx={{ mr: 3 }}>{icon}</Box>
      <CardContent sx={{ p: '0 !important' }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight="500">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
}
