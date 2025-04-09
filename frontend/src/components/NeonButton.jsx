import React from 'react';
import { Button, styled } from '@mui/material';

const StyledNeonButton = styled(Button)(({ theme, color = 'primary' }) => {
  const colors = {
    primary: {
      main: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.7)',
      gradient: 'linear-gradient(45deg, #00f0ff 30%, #00a0ff 90%)',
    },
    secondary: {
      main: '#ff00a0',
      glow: 'rgba(255, 0, 160, 0.7)',
      gradient: 'linear-gradient(45deg, #ff00a0 30%, #ff0058 90%)',
    },
    success: {
      main: '#00ff9d',
      glow: 'rgba(0, 255, 157, 0.7)',
      gradient: 'linear-gradient(45deg, #00ff9d 30%, #00d68f 90%)',
    },
  };
  
  const colorObj = colors[color] || colors.primary;
  
  return {
    background: colorObj.gradient,
    color: '#fff',
    border: `1px solid ${colorObj.main}`,
    borderRadius: '4px',
    padding: '10px 24px',
    fontFamily: '"Orbitron", sans-serif',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'none',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 0 10px ${colorObj.glow}`,
    transition: 'all 0.3s ease',
    
    '&:hover': {
      boxShadow: `0 0 20px ${colorObj.glow}`,
      transform: 'translateY(-2px)',
    },
    
    '&:before': {
      content: '""',
      position: 'absolute',
      top: '-2px',
      left: '-2px',
      right: '-2px',
      bottom: '-2px',
      zIndex: -1,
      background: colorObj.gradient,
      filter: 'blur(10px)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
    },
    
    '&:hover:before': {
      opacity: 0.7,
    },
    
    '&:after': {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent)',
      transform: 'translateX(-100%)',
    },
    
    '&:hover:after': {
      transform: 'translateX(100%)',
      transition: 'transform 0.6s ease',
    },
    
    '&:disabled': {
      background: '#2a2a3a',
      borderColor: '#444',
      color: '#666',
      boxShadow: 'none',
    },
  };
});

const NeonButton = ({ children, color = 'primary', ...props }) => {
  return (
    <StyledNeonButton color={color} {...props}>
      {children}
    </StyledNeonButton>
  );
};

export default NeonButton; 