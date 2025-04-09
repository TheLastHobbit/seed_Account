import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const MatrixRain = ({ opacity = 0.05 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // 设置画布大小
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    // 字符集
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // 每列的当前位置
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -canvas.height / fontSize);
    }
    
    // 绘制数字雨
    const draw = () => {
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0f0';
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        // 随机选择一个字符
        const char = chars[Math.floor(Math.random() * chars.length)];
        
        // 绘制字符
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        // 渐变颜色效果
        const gradient = ctx.createLinearGradient(x, y - fontSize * 5, x, y);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0)');
        gradient.addColorStop(0.8, 'rgba(0, 255, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 1)');
        
        ctx.fillStyle = gradient;
        ctx.fillText(char, x, y);
        
        // 更新位置
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [opacity]);
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: opacity,
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  );
};

export default MatrixRain; 