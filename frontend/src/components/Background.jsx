import React from 'react';
import { Box } from '@mui/material';

const Background = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        background: 'radial-gradient(circle at 50% 50%, #1a1b3a 0%, #0a0b1e 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h20v20H0z" fill="%23ffffff" fill-opacity="0.03"/%3E%3C/svg%3E")',
          opacity: 0.3,
        },
      }}
    />
  );
};

export default Background; 