import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  
  return (
    <AppBar position="static" sx={{ background: 'rgba(10, 11, 30, 0.8)', backdropFilter: 'blur(10px)' }}>
      <Container>
        <Toolbar disableGutters>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #00f0ff, #00a0ff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            onClick={() => navigate('/')}
          >
            环签名隐私系统
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="primary" 
              variant="outlined"
              onClick={() => navigate('/seed-account')}
            >
              根账户
            </Button>
            <Button 
              color="secondary" 
              variant="outlined"
              onClick={() => navigate('/shadow-account')}
            >
              影子账户
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 