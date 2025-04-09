import React from 'react';
import { Card } from '@mui/material';

const GlassCard = ({ children, ...props }) => {
  return (
    <Card 
      {...props} 
      sx={{ 
        background: 'rgba(19, 20, 43, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: 3,
        ...props.sx
      }}
    >
      {children}
    </Card>
  );
};

export default GlassCard; 