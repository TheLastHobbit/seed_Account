import React, { useState } from 'react';
import { Box, styled } from '@mui/material';

const CardContainer = styled(Box)(({ theme }) => ({
  perspective: '1000px',
  width: '100%',
  height: '100%',
}));

const CardInner = styled(Box)(({ flipped }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  transition: 'transform 0.8s',
  transformStyle: 'preserve-3d',
  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
}));

const CardSide = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
}));

const CardFront = styled(CardSide)(({ theme }) => ({
  background: 'rgba(19, 20, 43, 0.8)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
}));

const CardBack = styled(CardSide)(({ theme }) => ({
  background: 'rgba(19, 20, 43, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  transform: 'rotateY(180deg)',
}));

const RotatingCard = ({ frontContent, backContent }) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  return (
    <CardContainer onClick={handleFlip}>
      <CardInner flipped={flipped}>
        <CardFront>{frontContent}</CardFront>
        <CardBack>{backContent}</CardBack>
      </CardInner>
    </CardContainer>
  );
};

export default RotatingCard; 