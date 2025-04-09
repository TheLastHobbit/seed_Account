import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './CertificationManager.css';
import RingSignatureVisualizer from './RingSignatureVisualizer';
import config from '../config';

// SeedCertifier 合约 ABI
const contractABI = [
  "function certifySeed(address seedAddr, address soulAddr, address[] calldata ring, bytes32 keyImage, bytes32[] calldata c, bytes32[] calldata r) external",
  "function certifySeedOptimized(address seedAddr, address soulAddr, address[] calldata ring, bytes32 keyImage, bytes32[] calldata z, bytes32 finalHash, bytes32 c0) external",
  "function isCertified(address seedAddr) external view returns (bool)",
  "function getSoulAccount(address seedAddr) external view returns (address)",
  "event SeedCertified(address indexed seedAddr, address indexed soulAddr, bytes32 keyImage)"
];

// Sepolia 网络上部署的合约地址
const contractAddress = "0x226C796394190AdAE21Bf619EE4296cD1C38b277";

function CertificationManager({ seedAddress, soulAddress, isCertified, onCertificationUpdated }) {
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState(null);
  const [signatureDetails, setSignatureDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [useOptimized, setUseOptimized] = useState(true);
  const [balance, setBalance] = useState('0');
  const [localIsCertified, setLocalIsCertified] = useState(isCertified);
  const [verifying, setVerifying] = useState(false);
  const [localSoulAddress, setLocalSoulAddress] = useState(soulAddress || '');
  
  // 初始化
  useEffect(() => {
    const initProvider = async () => {
      // 使用公共 RPC 提供商
      const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/dbe77fbac5b8494e8f03b1099638abfd');
      setProvider(provider);
    };
    
    initProvider();
    
    // 从本地存储加载认证数据
    const loadStoredCertification = () => {
      try {
        const storedCertification = localStorage.getItem('certificationDetails');
        if (storedCertification) {
          const certData = JSON.parse(storedCertification);
          setSignatureDetails(certData);
        }
      } catch (error) {
        console.error('加载存储的认证数据失败:', error);
      }
    };
    
    loadStoredCertification();
  }, []);
  
  // 当 isCertified prop 变化时更新本地状态
  useEffect(() => {
    setLocalIsCertified(isCertified);
  }, [isCertified]);
  
  // 当根账户或提供商变化时，检查余额和认证状态
  useEffect(() => {
    if (seedAddress && provider) {
      checkBalance();
      checkCertificationStatus();
    }
  }, [seedAddress, provider]);
  
  // 检查余额
  const checkBalance = async () => {
    if (!seedAddress || !provider) return;
    
    try {
      const balanceWei = await provider.getBalance(seedAddress);
      // 将 Wei 转换为 ETH，并保留 5 位小数
      const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(5);
      setBalance(balanceEth);
    } catch (error) {
      console.error('获取余额失败:', error);
      setStatus('获取余额失败: ' + error.message);
    }
  };
  
  // 检查认证状态
  const checkCertificationStatus = async () => {
    if (!seedAddress || !provider) return;
    
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const certified = await contract.isCertified(seedAddress);
      
      setLocalIsCertified(certified);
      
      if (certified) {
        const linkedSoul = await contract.getSoulAccount(seedAddress);
        console.log('根账户已认证，关联的影子账户:', linkedSoul);
        
        // 通知父组件认证状态
        if (onCertificationUpdated) {
          onCertificationUpdated(true, signatureDetails);
        }
      } else {
        console.log('根账户未认证');
        
        // 通知父组件认证状态
        if (onCertificationUpdated) {
          onCertificationUpdated(false, null);
        }
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setStatus('检查认证状态失败: ' + error.message);
    }
  };
  
  // 认证根账户（实际调用后端API）
  const certifySeedAccount = async () => {
    if (!seedAddress) {
      setStatus('请先创建根账户');
      console.log('认证失败: 未提供根账户地址');
      return;
    }
    
    console.log('开始认证流程，根账户地址:', seedAddress);
    
    try {
      setStatus('正在准备认证...');
      setProcessingStep('准备环签名');
      
      // 获取私钥（在实际应用中，这应该从安全存储中获取）
      const seedPrivateKey = localStorage.getItem('seedPrivateKey');
      console.log('从本地存储获取私钥:', seedPrivateKey ? '成功' : '失败');
      
      // 如果没有找到私钥，尝试从会话存储中获取
      let privateKey = seedPrivateKey;
      if (!privateKey) {
        privateKey = sessionStorage.getItem('seedPrivateKey');
        console.log('从会话存储获取私钥:', privateKey ? '成功' : '失败');
      }
      
      // 如果仍然没有找到私钥，尝试使用硬编码的测试私钥（仅用于开发）
      if (!privateKey) {
        // 这只是一个示例私钥，实际应用中不应该硬编码
        privateKey = '0x' + '1'.repeat(64); // 示例私钥，实际使用时应替换
        console.log('使用测试私钥:', privateKey.substring(0, 10) + '...');
        
        // 将测试私钥保存到本地存储，以便后续使用
        localStorage.setItem('seedPrivateKey', privateKey);
        console.log('已将测试私钥保存到本地存储');
      }
      
      // 生成随机nonce防止重放攻击
      const nonce = Math.floor(Math.random() * 1000000).toString();
      console.log('生成nonce:', nonce);
      
      // 准备请求数据
      const requestData = {
        seedAddress,
        seedPrivateKey: privateKey,
        soulAddress: localSoulAddress || '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        nonce
      };
      
      console.log('准备发送请求数据:', {
        seedAddress: requestData.seedAddress,
        seedPrivateKeyLength: requestData.seedPrivateKey ? requestData.seedPrivateKey.length : 0,
        soulAddress: requestData.soulAddress,
        nonce: requestData.nonce
      });
      
      // 在发送请求前检查API URL
      console.log('API URL:', config.getApiUrl('generateSignature'));

      // 检查本地存储中的所有项
      console.log('本地存储内容:', {
        seedAddress: localStorage.getItem('seedAddress'),
        seedPrivateKeyExists: !!localStorage.getItem('seedPrivateKey'),
        seedPrivateKeyLength: localStorage.getItem('seedPrivateKey') ? localStorage.getItem('seedPrivateKey').length : 0
      });
      
      // 调用后端API生成环签名
      console.log('发送认证请求到后端...');
      const response = await axios.post(config.getApiUrl('generateSignature'), requestData);
      
      console.log('收到认证响应:', {
        valid: response.data.valid,
        hasAuthToken: !!response.data.authToken,
        hasKeyImage: !!response.data.keyImage,
        ringLength: response.data.ring ? response.data.ring.length : 0
      });
      
      if (response.data.valid) {
        // 保存认证信息到本地存储
        localStorage.setItem('authToken', response.data.authToken);
        localStorage.setItem('seedAddress', seedAddress);
        localStorage.setItem('keyImage', response.data.keyImage);
        localStorage.setItem('ring', JSON.stringify(response.data.ring));
        
        console.log('已保存认证信息到本地存储:', {
          authToken: response.data.authToken ? response.data.authToken.substring(0, 8) + '...' : null,
          seedAddress,
          keyImage: response.data.keyImage ? response.data.keyImage.substring(0, 10) + '...' : null
        });
        
        // 保存签名详情
        const signatureData = {
          ring: response.data.ring,
          keyImage: response.data.keyImage,
          signature: response.data.signature,
          timestamp: new Date().toISOString(),
          useOptimized
        };
        
        setSignatureDetails(signatureData);
        localStorage.setItem('certificationDetails', JSON.stringify(signatureData));
        console.log('已保存签名详情到本地存储');
        
        setStatus('认证成功！您的根账户已成功认证。');
        setLocalIsCertified(true);
        console.log('认证成功，已更新UI状态');
        
        // 通知父组件认证状态
        if (onCertificationUpdated) {
          onCertificationUpdated(true, signatureData);
          console.log('已通知父组件认证状态更新');
        }
      } else {
        console.log('认证失败:', response.data.error || '未知错误');
        setStatus('认证失败: ' + (response.data.error || '未知错误'));
      }
    } catch (error) {
      console.error('认证过程发生错误:', error);
      console.log('错误详情:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : '无响应数据'
      });
      setStatus('认证失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingStep('');
      console.log('认证流程结束');
    }
  };
  
  // 重新认证
  const recertifySeedAccount = () => {
    // 清除认证状态
    setLocalIsCertified(false);
    setSignatureDetails(null);
    
    // 清除本地存储中的认证数据
    localStorage.removeItem('certificationDetails');
    localStorage.removeItem('shadowSignatureDetails');
    
    // 重新检查认证状态
    checkCertificationStatus();
    
    // 通知父组件认证状态
    if (onCertificationUpdated) {
      onCertificationUpdated(false, null);
    }
    
    setStatus('认证状态已重置，请重新认证根账户。');
  };
  
  // 验证认证状态
  const verifyCertification = async () => {
    console.log('开始验证认证状态...');
    
    try {
      setVerifying(true);
      
      // 从本地存储获取认证信息
      const storedAuthToken = localStorage.getItem('authToken');
      const storedSeedAddress = localStorage.getItem('seedAddress');
      
      console.log('从本地存储获取认证信息:', {
        hasAuthToken: !!storedAuthToken,
        hasSeedAddress: !!storedSeedAddress,
        authToken: storedAuthToken ? storedAuthToken.substring(0, 8) + '...' : null,
        seedAddress: storedSeedAddress
      });
      
      if (!storedAuthToken || !storedSeedAddress) {
        console.error('本地存储中没有认证信息');
        setLocalIsCertified(false);
        setVerifying(false);
        setStatus('验证失败: 未找到认证信息');
        return;
      }
      
      // 调用后端API验证认证状态
      console.log('发送验证请求到后端...');
      console.log('API URL:', config.getApiUrl('verifyCertification'));
      
      const response = await axios.post(config.getApiUrl('verifyCertification'), {
        seedAddress: storedSeedAddress,
        authToken: storedAuthToken
      });
      
      console.log('收到验证响应:', response.data);
      
      if (response.data.isCertified) {
        console.log('验证成功，账户已认证');
        setLocalIsCertified(true);
        setLocalSoulAddress(response.data.soulAddress);
        // 存储灵魂地址到本地存储
        localStorage.setItem('soulAddress', response.data.soulAddress);
        setStatus('验证成功: 您的根账户已认证');
      } else {
        console.log('验证失败，账户未认证');
        setLocalIsCertified(false);
        // 清除本地存储中的认证信息
        localStorage.removeItem('authToken');
        localStorage.removeItem('soulAddress');
        setStatus('验证失败: 您的根账户未认证');
      }
    } catch (error) {
      console.error('验证过程发生错误:', error);
      console.log('错误详情:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : '无响应数据'
      });
      setLocalIsCertified(false);
      // 清除本地存储中的认证信息
      localStorage.removeItem('authToken');
      localStorage.removeItem('soulAddress');
      setStatus('验证失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setVerifying(false);
      console.log('验证流程结束');
    }
  };
  
  return (
    <div className="certification-manager">
      {!localIsCertified ? (
        <div className="certification-form">
          <p className="certification-info">
            认证根账户可以将您的根账户与影子账户关联起来。
            通过环签名技术，您可以在不泄露根账户身份的情况下证明您拥有影子账户的控制权。
          </p>
          
          <div className="certification-options">
            <div className="option">
              <input 
                type="radio" 
                id="optimized" 
                name="signatureType" 
                checked={useOptimized} 
                onChange={() => setUseOptimized(true)}
              />
              <label htmlFor="optimized">使用优化版环签名（推荐，gas 费更低）</label>
            </div>
            
            <div className="option">
              <input 
                type="radio" 
                id="standard" 
                name="signatureType" 
                checked={!useOptimized} 
                onChange={() => setUseOptimized(false)}
              />
              <label htmlFor="standard">使用标准版环签名</label>
            </div>
          </div>
          
          <button 
            onClick={certifySeedAccount}
            className="certify-button"
            disabled={!seedAddress || parseFloat(balance) <= 0}
          >
            认证根账户
          </button>
          
          {parseFloat(balance) <= 0 && (
            <p className="warning">
              根账户余额不足，请先向根账户地址发送一些 ETH 作为 gas 费。
            </p>
          )}
          
          <button 
            onClick={verifyCertification}
            className="verify-button"
            disabled={verifying}
          >
            验证认证状态
          </button>
        </div>
      ) : (
        <div className="certification-status">
          <div className="status-card">
            <div className="status-header">
              <h3>认证状态</h3>
              <span className="certified-badge">已认证</span>
            </div>
            <p>您的根账户已成功认证并关联影子账户。</p>
            <p>现在您可以使用影子账户进行交易，而不泄露您的身份。</p>
            
            <button 
              onClick={recertifySeedAccount}
              className="recertify-button"
            >
              重新认证根账户
            </button>
            
            <button 
              onClick={verifyCertification}
              className="verify-button"
              disabled={verifying}
            >
              验证认证状态
            </button>
          </div>
        </div>
      )}
      
      {processingStep && (
        <div className="processing-steps">
          <h4>处理步骤</h4>
          <div className="step-indicator">
            <div className={`step ${processingStep === '准备环签名' ? 'active' : ''}`}>准备环签名</div>
            <div className={`step ${processingStep === '提交交易' ? 'active' : ''}`}>提交交易</div>
            <div className={`step ${processingStep === '等待确认' ? 'active' : ''}`}>等待确认</div>
          </div>
        </div>
      )}
      
      {status && <p className="status-message">{status}</p>}
      
      {signatureDetails && localIsCertified && (
        <div className="signature-section">
          <div className="signature-details">
            <h3>环签名详情 <button onClick={() => setShowDetails(!showDetails)}>{showDetails ? '隐藏' : '显示'}</button></h3>
            
            {showDetails && (
              <div className="details-content">
                <p><strong>生成时间:</strong> {signatureDetails.timestamp}</p>
                <p><strong>关键映像 (Key Image):</strong> <span className="code">{signatureDetails.keyImage.substring(0, 20)}...</span></p>
                <p><strong>环大小:</strong> {signatureDetails.ring.length} 个成员</p>
                
                <div className="collapsible">
                  <h4>环成员 (Ring Members)</h4>
                  <div className="scrollable">
                    {signatureDetails.ring.map((member, index) => (
                      <div key={index} className="ring-member">
                        <span className="index">{index + 1}.</span>
                        <span className="address">{member}</span>
                        {member === seedAddress && <span className="tag">签名者</span>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="collapsible">
                  <h4>签名数据</h4>
                  <div className="signature-data">
                    <p><strong>c 值:</strong></p>
                    <div className="scrollable">
                      {signatureDetails.signature.c.map((c, index) => (
                        <div key={index} className="data-row">
                          <span className="index">{index + 1}.</span>
                          <span className="value">{c.substring(0, 20)}...</span>
                        </div>
                      ))}
                    </div>
                    
                    <p><strong>r 值:</strong></p>
                    <div className="scrollable">
                      {signatureDetails.signature.r.map((r, index) => (
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
          
          <RingSignatureVisualizer signatureDetails={signatureDetails} seedAddress={seedAddress} />
        </div>
      )}
    </div>
  );
}

export default CertificationManager; 