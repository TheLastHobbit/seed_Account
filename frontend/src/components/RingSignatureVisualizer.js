import React, { useEffect, useRef } from 'react';
import './RingSignatureVisualizer.css';

function RingSignatureVisualizer({ signatureDetails, seedAddress }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!signatureDetails || !canvasRef.current) return;
    
    // 确保 signatureDetails 包含必要的数据
    if (!signatureDetails.ring || !signatureDetails.keyImage) {
      console.error('环签名详情缺少必要数据');
      return;
    }
    
    // 解析签名数据
    let signature;
    try {
      signature = typeof signatureDetails.signature === 'string' 
        ? JSON.parse(signatureDetails.signature) 
        : signatureDetails.signature;
    } catch (error) {
      console.error('解析签名数据失败:', error);
      return;
    }
    
    // 确保签名数据包含必要的字段
    if (!signature || !signature.c || !signature.r) {
      console.error('签名数据缺少必要字段');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制环
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制环成员
    const ring = signatureDetails.ring;
    const n = ring.length;
    
    ring.forEach((address, i) => {
      const angle = (i / n) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // 绘制节点
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      
      // 如果是签名者，使用不同颜色
      if (address.toLowerCase() === seedAddress.toLowerCase()) {
        ctx.fillStyle = '#ff6b6b';
      } else {
        ctx.fillStyle = '#4ecdc4';
      }
      
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 绘制地址标签
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(address.substring(0, 6) + '...' + address.substring(38), x, y + 25);
    });
    
    // 绘制关键映像
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#f9dc5c';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制关键映像标签
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Key Image', centerX, centerY + 5);
    
    // 绘制连接线
    // 确保 c 和 r 是数组
    if (Array.isArray(signature.c) && Array.isArray(signature.r)) {
      ring.forEach((_, i) => {
        const angle = (i / n) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // 绘制到中心的连接线
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 在连接线上显示 c 和 r 值的前几个字符
        const midX = (x + centerX) / 2;
        const midY = (y + centerY) / 2;
        
        if (signature.c[i]) {
          ctx.fillStyle = '#333';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`c: ${signature.c[i].substring(0, 4)}...`, midX, midY - 5);
        }
        
        if (signature.r[i]) {
          ctx.fillStyle = '#333';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`r: ${signature.r[i].substring(0, 4)}...`, midX, midY + 10);
        }
      });
    }
  }, [signatureDetails, seedAddress]);
  
  return (
    <div className="ring-signature-visualizer">
      <h3>环签名可视化</h3>
      <canvas ref={canvasRef} width={600} height={400} />
    </div>
  );
}

export default RingSignatureVisualizer; 