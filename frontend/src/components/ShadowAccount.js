import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './ShadowAccount.css';
import RingSignatureVisualizer from './RingSignatureVisualizer';

// 假设这是您在另一个文件夹中实现的 AA 钱包模块
// import { createAAWallet, executeAATransaction } from '../../aa-wallet/index';

function ShadowAccount({ soulWallet, soulAddress, signatureDetails }) {
  const [shadowWallet, setShadowWallet] = useState(null);
  const [shadowAddress, setShadowAddress] = useState('');
  const [isAAWallet, setIsAAWallet] = useState(false);
  const [status, setStatus] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [shadowSignatureDetails, setShadowSignatureDetails] = useState(null);
  const [isLinked, setIsLinked] = useState(false);
  
  // 添加强制清除本地存储中的影子账户关联状态的效果
  useEffect(() => {
    // 清除影子账户关联状态
    localStorage.removeItem('shadowSignatureDetails');
    setIsLinked(false);
    setShadowSignatureDetails(null);
    
    // 这是一个一次性的清除操作，所以依赖数组为空
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 从本地存储加载影子账户
  useEffect(() => {
    const savedShadow = localStorage.getItem('shadowWallet');
    
    if (savedShadow) {
      try {
        const shadowData = JSON.parse(savedShadow);
        setShadowAddress(shadowData.address);
        
        if (shadowData.isAA) {
          // 处理 AA 钱包
          setShadowWallet({
            address: shadowData.address,
            owner: new ethers.Wallet(shadowData.ownerPrivateKey),
            implementation: shadowData.implementation,
            factoryAddress: shadowData.factoryAddress
          });
          setIsAAWallet(true);
        } else {
          // 处理 EOA 钱包
          setShadowWallet(new ethers.Wallet(shadowData.privateKey));
          setIsAAWallet(false);
        }
      } catch (error) {
        console.error('加载保存的影子账户失败:', error);
      }
    }
  }, []);
  
  // 生成新的 EOA 影子账户
  const generateShadowAccount = () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setShadowWallet(wallet);
      setShadowAddress(wallet.address);
      setIsAAWallet(false);
      
      // 保存到本地存储
      localStorage.setItem('shadowWallet', JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey,
        isAA: false
      }));
      
      setStatus('新的影子账户已生成！');
      // 重置关联状态
      setIsLinked(false);
      setShadowSignatureDetails(null);
      localStorage.removeItem('shadowSignatureDetails');
    } catch (error) {
      setStatus('生成影子账户失败: ' + error.message);
    }
  };
  
  // 生成新的 AA 影子账户
  const generateAAShadowAccount = async () => {
    try {
      setStatus('正在生成 AA 影子账户...');
      
      // 这里应该调用您的 AA 钱包创建函数
      // 为了示例，我们使用一个模拟实现
      const owner = ethers.Wallet.createRandom();
      const address = `0x${crypto.randomBytes(20).toString('hex')}`;
      
      setShadowWallet({
        address,
        owner,
        implementation: '0x...',
        factoryAddress: '0x...'
      });
      setShadowAddress(address);
      setIsAAWallet(true);
      
      // 保存到本地存储
      localStorage.setItem('shadowWallet', JSON.stringify({
        address,
        ownerPrivateKey: owner.privateKey,
        implementation: '0x...',
        factoryAddress: '0x...',
        isAA: true
      }));
      
      setStatus('新的 AA 影子账户已生成！');
      // 重置关联状态
      setIsLinked(false);
      setShadowSignatureDetails(null);
      localStorage.removeItem('shadowSignatureDetails');
    } catch (error) {
      setStatus('生成 AA 影子账户失败: ' + error.message);
    }
  };
  
  // 生成影子账户的环签名（关联灵魂账户和影子账户）
  const linkShadowAccount = async () => {
    if (!soulWallet || !shadowAddress) {
      setStatus('请先创建影子账户');
      return;
    }
    
    try {
      setProcessingStep('生成环签名');
      setStatus('正在生成环签名...');
      
      // 确保私钥格式正确
      let privateKey = soulWallet.privateKey;
      
      // 检查私钥是否有效
      if (!privateKey) {
        throw new Error('灵魂账户私钥无效');
      }
      
      // 确保私钥以 0x 开头
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      // 使用与根账户认证相同的环
      const ring = signatureDetails ? signatureDetails.ring : [];
      
      // 发送请求到后端生成环签名
      const response = await axios.post('http://localhost:3003/api/generate-shadow-signature', {
        soulAddress,
        soulPrivateKey: privateKey,
        shadowAddress,
        ring
      });
      
      // 保存环签名数据
      const shadowSignatureData = {
        ...response.data,
        soulAddress, // 添加灵魂账户地址，用于后续验证
        signature: typeof response.data.signature === 'string' 
          ? JSON.parse(response.data.signature) 
          : response.data.signature
      };
      
      setShadowSignatureDetails(shadowSignatureData);
      
      // 保存到本地存储
      localStorage.setItem('shadowSignatureDetails', JSON.stringify(shadowSignatureData));
      
      setProcessingStep('');
      setStatus('环签名生成成功！影子账户已与灵魂账户关联');
      
      // 更新状态
      setIsLinked(true);
      
      return shadowSignatureData;
    } catch (error) {
      console.error('关联影子账户失败:', error);
      setStatus('关联影子账户失败: ' + (error.response?.data?.error || error.message));
      setProcessingStep('');
      return null;
    }
  };
  
  return (
    <div className="shadow-account">
      <h4>影子账户</h4>
      
      {!shadowWallet ? (
        <div className="account-creation">
          <button onClick={generateShadowAccount}>生成 EOA 影子账户</button>
          <button onClick={generateAAShadowAccount} className="aa-button">生成 AA 影子账户</button>
          <div className="account-type-info">
            <p><strong>EOA 账户</strong>: 传统以太坊账户，由私钥控制</p>
            <p><strong>AA 账户</strong>: 基于 ERC-4337 的账户抽象钱包，支持高级功能</p>
          </div>
        </div>
      ) : (
        <div className="account-details">
          <p>
            <strong>账户类型:</strong> {isAAWallet ? 'AA 钱包 (ERC-4337)' : 'EOA 钱包'}
          </p>
          <p><strong>地址:</strong> {shadowAddress}</p>
          
          {!isLinked ? (
            <button 
              onClick={linkShadowAccount}
              className="link-button"
              disabled={!signatureDetails || !signatureDetails.ring}
            >
              关联影子账户与灵魂账户
            </button>
          ) : (
            <div className="linked-status">
              <p className="success">✓ 已成功关联</p>
              <p>此影子账户已通过环签名与您的灵魂账户关联，可以安全使用。</p>
            </div>
          )}
          
          {!signatureDetails || !signatureDetails.ring ? (
            <p className="warning">
              请先完成根账户认证，才能关联影子账户。
            </p>
          ) : null}
        </div>
      )}
      
      {processingStep && (
        <div className="processing-steps">
          <h4>处理步骤</h4>
          <div className="step-indicator">
            <div className={`step ${processingStep === '生成环签名' ? 'active' : ''}`}>生成环签名</div>
            <div className={`step ${processingStep === '验证签名' ? 'active' : ''}`}>验证签名</div>
            <div className={`step ${processingStep === '完成关联' ? 'active' : ''}`}>完成关联</div>
          </div>
        </div>
      )}
      
      {status && <p className="status-message">{status}</p>}
      
      {shadowSignatureDetails && (
        <div className="signature-section">
          <div className="signature-details">
            <h4>影子账户环签名详情 <button onClick={() => setShowDetails(!showDetails)}>{showDetails ? '隐藏' : '显示'}</button></h4>
            
            {showDetails && (
              <div className="details-content">
                <p><strong>生成时间:</strong> {shadowSignatureDetails.timestamp}</p>
                <p><strong>关键映像 (Key Image):</strong> <span className="code">{shadowSignatureDetails.keyImage.substring(0, 20)}...</span></p>
                <p><strong>环大小:</strong> {shadowSignatureDetails.ring.length} 个成员</p>
                
                <div className="collapsible">
                  <h4>环成员 (Ring Members)</h4>
                  <div className="scrollable">
                    {shadowSignatureDetails.ring.map((member, index) => (
                      <div key={index} className="ring-member">
                        <span className="index">{index + 1}.</span>
                        <span className="address">{member}</span>
                        {member === soulAddress && <span className="tag">签名者</span>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="collapsible">
                  <h4>签名数据</h4>
                  <div className="signature-data">
                    <p><strong>c 值:</strong></p>
                    <div className="scrollable">
                      {shadowSignatureDetails.signature.c.map((c, index) => (
                        <div key={index} className="data-row">
                          <span className="index">{index + 1}.</span>
                          <span className="value">{c.substring(0, 20)}...</span>
                        </div>
                      ))}
                    </div>
                    
                    <p><strong>r 值:</strong></p>
                    <div className="scrollable">
                      {shadowSignatureDetails.signature.r.map((r, index) => (
                        <div key={index} className="data-row">
                          <span className="index">{index + 1}.</span>
                          <span className="value">{r.substring(0, 20)}...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <RingSignatureVisualizer signatureDetails={shadowSignatureDetails} seedAddress={soulAddress} />
        </div>
      )}
      
      <div className="shadow-account-info">
        <h4>影子账户的作用</h4>
        <p>
          影子账户允许您在不泄露灵魂账户身份的情况下进行交易和互动。通过环签名，您可以证明自己拥有灵魂账户的控制权，
          而不必透露具体是哪个灵魂账户。
        </p>
        <ul>
          <li>匿名交易：使用影子账户进行交易，不会泄露您的灵魂账户身份</li>
          <li>隐私保护：多个影子账户之间没有可见的关联</li>
          <li>可验证性：通过环签名，可以证明影子账户由有效的灵魂账户控制</li>
        </ul>
      </div>
    </div>
  );
}

export default ShadowAccount; 