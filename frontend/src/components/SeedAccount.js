import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './SeedAccount.css';
import RingSignatureVisualizer from './RingSignatureVisualizer';
import ShadowAccount from './ShadowAccount';
import { Button, FormControlLabel, Switch } from '@mui/material';

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

function SeedAccount({ onSoulAccountCreated }) {
  const [seedWallet, setSeedWallet] = useState(null);
  const [seedAddress, setSeedAddress] = useState('');
  const [soulWallet, setSoulWallet] = useState(null);
  const [soulAddress, setSoulAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [isCertified, setIsCertified] = useState(false);
  const [linkedSoul, setLinkedSoul] = useState('');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState(null);
  const [signatureDetails, setSignatureDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [useOptimized, setUseOptimized] = useState(true);
  const [forceRecertify, setForceRecertify] = useState(false);

  // 初始化
  useEffect(() => {
    const initProvider = async () => {
      // 使用公共 RPC 提供商，不需要连接用户钱包
      const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/dbe77fbac5b8494e8f03b1099638abfd');
      setProvider(provider);
    };
    
    initProvider();
    
    // 从本地存储加载已保存的根账户和灵魂账户
    const savedSeed = localStorage.getItem('seedWallet');
    const savedSoul = localStorage.getItem('soulWallet');
    const savedSignature = localStorage.getItem('signatureDetails');
    
    if (savedSeed) {
      try {
        const seedData = JSON.parse(savedSeed);
        const wallet = new ethers.Wallet(seedData.privateKey);
        setSeedWallet(wallet);
        setSeedAddress(wallet.address);
        console.log('从本地存储加载根账户:', wallet.address);
      } catch (error) {
        console.error('加载保存的根账户失败:', error);
        // 清除可能损坏的数据
        localStorage.removeItem('seedWallet');
      }
    }
    
    if (savedSoul) {
      try {
        const soulData = JSON.parse(savedSoul);
        const wallet = new ethers.Wallet(soulData.privateKey);
        setSoulWallet(wallet);
        setSoulAddress(wallet.address);
        console.log('从本地存储加载灵魂账户:', wallet.address);
      } catch (error) {
        console.error('加载保存的灵魂账户失败:', error);
        // 清除可能损坏的数据
        localStorage.removeItem('soulWallet');
      }
    }
    
    if (savedSignature) {
      try {
        const signatureData = JSON.parse(savedSignature);
        setSignatureDetails(signatureData);
        console.log('从本地存储加载环签名数据');
      } catch (error) {
        console.error('加载保存的环签名数据失败:', error);
        // 清除可能损坏的数据
        localStorage.removeItem('signatureDetails');
      }
    }
  }, []);

  // 当根账户或提供商变化时，检查余额、认证状态和关联的灵魂账户
  useEffect(() => {
    if (seedAddress && provider) {
      checkBalance();
      checkCertificationStatus();
    }
  }, [seedAddress, provider]);

  // 在组件加载时检查认证状态
  useEffect(() => {
    const checkCertificationStatus = async () => {
      try {
        // 从本地存储获取认证信息
        const storedDetails = localStorage.getItem('signatureDetails');
        if (!storedDetails) {
          setIsCertified(false);
          return;
        }
        
        const details = JSON.parse(storedDetails);
        
        // 验证认证状态
        const response = await axios.post('http://localhost:3003/api/verify-certification', {
          seedAddress: seedAddress,
          authToken: details.authToken
        }).catch(error => {
          console.log('验证认证状态失败:', error);
          return { data: { isCertified: false } };
        });
        
        // 设置认证状态，但不阻止用户重新认证
        setIsCertified(response.data.isCertified);
        
        // 如果认证无效，清除本地存储
        if (!response.data.isCertified) {
          localStorage.removeItem('signatureDetails');
          setSignatureDetails(null);
        }
      } catch (error) {
        console.error('检查认证状态失败:', error);
        setIsCertified(false);
      }
    };
    
    if (seedAddress) {
      checkCertificationStatus();
    }
  }, [seedAddress]);

  // 创建根账户
  const createSeedAccount = () => {
    try {
      console.log('开始创建根账户...');
      
      // 创建新的钱包
      const wallet = ethers.Wallet.createRandom();
      const address = wallet.address;
      const privateKey = wallet.privateKey;
      
      console.log('生成新钱包:', {
        address,
        privateKeyLength: privateKey.length
      });
      
      // 保存到本地存储
      localStorage.setItem('seedAddress', address);
      localStorage.setItem('seedPrivateKey', privateKey);
      
      // 同时保存到会话存储作为备份
      sessionStorage.setItem('seedAddress', address);
      sessionStorage.setItem('seedPrivateKey', privateKey);
      
      // 保存完整钱包对象
      setSeedWallet(wallet);
      
      console.log('已保存钱包信息到本地存储和会话存储');
      
      // 更新状态
      setSeedAddress(address);
      setStatus('根账户创建成功！');
      
      console.log('根账户创建成功，地址:', address);
      
      return { address, privateKey };
    } catch (error) {
      console.error('创建根账户失败:', error);
      setStatus('创建根账户失败: ' + error.message);
      return null;
    }
  };

  // 生成新的灵魂账户
  const generateSoulAccount = () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setSoulWallet(wallet);
      setSoulAddress(wallet.address);
      
      // 保存到本地存储
      localStorage.setItem('soulWallet', JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey
      }));
      
      setStatus('新的灵魂账户已生成！');
      
      // 通知父组件
      if (onSoulAccountCreated) {
        onSoulAccountCreated(wallet, wallet.address, isCertified);
      }
    } catch (error) {
      setStatus('生成灵魂账户失败: ' + error.message);
    }
  };

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

  // 添加手动刷新余额的函数
  const refreshBalance = async () => {
    setStatus('正在刷新余额...');
    await checkBalance();
    setStatus('余额已刷新');
  };

  // 检查认证状态和关联的灵魂账户
  const checkCertificationStatus = async () => {
    if (!provider || !seedAddress) return;
    
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const certified = await contract.isCertified(seedAddress);
      setIsCertified(certified);
      
      if (certified) {
        const soul = await contract.getSoulAccount(seedAddress);
        setLinkedSoul(soul);
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
    }
  };

  // 认证根账户函数
  const certifySeedAccount = async () => {
    // 如果已认证但不是强制重新认证，则清除认证状态
    if (isCertified && !forceRecertify) {
      console.log('检测到已认证状态，正在清除以允许重新认证...');
      // 清除本地存储中的认证信息
      localStorage.removeItem('signatureDetails');
      setSignatureDetails(null);
      // 清除认证状态
      setIsCertified(false);
      // 下次点击时将进行实际认证
      return;
    }
    
    if (!seedWallet || !soulWallet) {
      setStatus('请先创建根账户和灵魂账户');
      return;
    }
    
    if (parseFloat(balance) <= 0) {
      setStatus('根账户余额不足，请先充值一些 ETH 作为 gas 费');
      return;
    }
    
    try {
      // 确保每次都记录日志，方便调试
      console.log('开始根账户认证流程...');
      console.log('认证状态:', { isCertified, forceRecertify });

      // 1. 生成环签名
      setProcessingStep('生成环签名');
      setStatus('正在生成环签名...');
      
      // 确保私钥格式正确
      let privateKey = seedWallet.privateKey;
      
      // 检查私钥是否有效
      if (!privateKey) {
        throw new Error('根账户私钥无效');
      }
      
      // 确保私钥以 0x 开头
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      console.log('步骤1: 获取根账户私钥成功');
      
      // 从后端获取环签名
      console.log('步骤2: 准备调用环签名生成API', {
        seedAddress,
        soulAddress,
        hasPrivateKey: !!privateKey
      });
      
      // 添加一个随机数，确保每次请求都是唯一的，避免被缓存
      const nonce = Math.floor(Math.random() * 1000000);
      
      const signatureResponse = await axios.post('http://localhost:3003/api/generate-signature', {
        seedAddress: seedAddress,
        seedPrivateKey: privateKey,
        soulAddress: soulAddress,
        nonce: nonce // 添加随机数
      });
      
      const { ring, signature: signatureStr, keyImage, authToken } = signatureResponse.data;
      let signature;
      try {
        signature = typeof signatureStr === 'string' ? JSON.parse(signatureStr) : signatureStr;
      } catch (error) {
        console.error('解析签名数据失败:', error);
        throw new Error('解析签名数据失败: ' + error.message);
      }
      
      console.log('步骤2: 环签名生成成功', {
        ringLength: ring.length,
        keyImage: keyImage,
        signatureKeys: Object.keys(signature),
        signatureC: signature.c.length,
        signatureR: signature.r.length
      });
      
      // 保存环签名数据，供后续使用
      const signatureData = {
        ...signatureResponse.data,
        signature: signature,
        authToken, // 保存认证令牌
        // 添加北京时间
        timestamp: Date.now(),
        beijingTime: new Date().toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      };
      setSignatureDetails(signatureData);
      
      // 保存到本地存储
      localStorage.setItem('signatureDetails', JSON.stringify(signatureData));
      
      // 2. 准备交易
      setProcessingStep('准备交易');
      setStatus('正在准备交易...');
      
      console.log('步骤3: 交易参数准备完成', {
        soulAddress,
        ringLength: ring.length,
        signatureDataKeys: Object.keys(signature),
        hasC: Array.isArray(signature.c),
        hasR: Array.isArray(signature.r)
      });
      
      // 连接钱包到提供商
      const signer = seedWallet.connect(provider);
      
      // 获取合约实例
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      
      // 准备交易参数
      const ringParam = ring.map(addr => addr);
      const cParam = signature.c.map(c => c);
      const rParam = signature.r.map(r => r);
      
      console.log('步骤4: 交易参数', {
        soulAddress,
        ringLength: ringParam.length,
        cLength: cParam.length,
        rLength: rParam.length
      });
      
      // 3. 发送交易
      setProcessingStep('发送交易');
      setStatus('正在发送交易...');
      
      console.log('步骤5: 设置gas限制为', ethers.utils.hexlify(3000000));
      
      // 调用合约方法
      console.log('步骤6: 尝试调用标准方法 certifySeedAccount');
      const tx = await contract.certifySeedAccount(
        soulAddress,
        ringParam,
        cParam,
        rParam,
        { gasLimit: 3000000 }
      );
      
      setStatus('交易已发送，等待确认...');
      console.log('步骤7: 交易已提交', tx.hash);
      
      // 4. 等待交易确认
      setProcessingStep('等待确认');
      const receipt = await tx.wait();
      
      console.log('步骤8: 交易已确认', {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        events: receipt.events ? receipt.events.length : 0
      });
      
      // 5. 更新状态
      setProcessingStep('');
      setStatus('根账户认证成功！');
      setIsCertified(true);
      
      // 通知父组件
      if (onSoulAccountCreated) {
        onSoulAccountCreated(soulAddress, signatureData);
      }
      
      return signatureData;
    } catch (error) {
      console.error('认证根账户失败:', error);
      setStatus('认证根账户失败: ' + (error.response?.data?.error || error.message));
      setProcessingStep('');
      return null;
    }
  };

  // 优化版认证函数
  const certifySeedAccountOptimized = async () => {
    if (!seedWallet || !soulWallet) {
      setStatus('请先创建根账户和灵魂账户');
      return;
    }
    
    if (parseFloat(balance) <= 0) {
      setStatus('根账户余额不足，请先充值一些 ETH 作为 gas 费');
      return;
    }
    
    try {
      // 1. 生成环签名
      setProcessingStep('生成环签名');
      setStatus('正在生成环签名...');
      
      // 确保私钥格式正确
      let privateKey = seedWallet.privateKey;
      
      // 检查私钥是否有效
      if (!privateKey) {
        throw new Error('根账户私钥无效');
      }
      
      // 确保私钥以 0x 开头
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      // 从后端获取环签名
      const signatureResponse = await axios.post('http://localhost:3003/api/generate-signature', {
        seedAddress: seedAddress,
        seedPrivateKey: privateKey,
        soulAddress: soulAddress
      });
      
      const { ring, signature: signatureStr, keyImage } = signatureResponse.data;
      const signature = JSON.parse(signatureStr);
      
      // 保存环签名数据，供后续使用
      const signatureData = signatureResponse.data;
      setSignatureDetails(signatureData);
      
      // 保存到本地存储
      localStorage.setItem('signatureDetails', JSON.stringify(signatureData));
      
      // 2. 链下验证并生成证明
      setProcessingStep('链下验证');
      setStatus('正在链下验证签名并生成证明...');
      
      const proofResponse = await axios.post('http://localhost:3003/api/generate-proof', {
        seedAddress: seedAddress,
        seedPrivateKey: privateKey,
        soulAddress: soulAddress,
        ring,
        signature
      });
      
      if (!proofResponse.data.valid) {
        setStatus('环签名验证失败');
        setProcessingStep('');
        return;
      }
      
      const { z, finalHash, c0 } = proofResponse.data.proof;
      
      // 3. 准备交易
      setProcessingStep('准备交易');
      setStatus('正在准备交易...');
      
      // 连接钱包到提供商
      const signer = seedWallet.connect(provider);
      
      // 创建合约实例
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // 4. 发送交易
      setProcessingStep('发送交易');
      setStatus('正在发送交易...');
      
      const tx = await contract.certifySeedOptimized(
        seedAddress,
        soulAddress,
        ring,
        '0x' + keyImage,
        z.map(zi => ethers.utils.hexZeroPad('0x' + zi, 32)),
        ethers.utils.hexZeroPad('0x' + finalHash, 32),
        ethers.utils.hexZeroPad('0x' + c0, 32)
      );
      
      // 5. 等待确认
      setProcessingStep('等待确认');
      setStatus('交易已发送，等待确认...');
      
      const receipt = await tx.wait();
      
      // 6. 更新状态
      setIsCertified(true);
      setLinkedSoul(soulAddress);
      setStatus('认证成功！根账户已与灵魂账户关联');
      setProcessingStep('');
      
      // 通知父组件
      if (onSoulAccountCreated) {
        onSoulAccountCreated(soulWallet, soulAddress, true);
      }
      
      // 刷新余额
      checkBalance();
      
      return receipt;
    } catch (error) {
      console.error('认证失败:', error);
      setStatus('认证失败: ' + (error.response?.data?.error || error.message));
      setProcessingStep('');
      return null;
    }
  };

  // 在认证状态变化时也通知父组件
  useEffect(() => {
    if (onSoulAccountCreated && soulWallet) {
      onSoulAccountCreated(soulWallet, soulAddress, isCertified);
    }
  }, [isCertified, soulWallet, soulAddress, onSoulAccountCreated]);

  // 添加清除缓存的函数
  const clearCache = () => {
    // 清除本地存储
    localStorage.removeItem('seedWallet');
    localStorage.removeItem('soulWallet');
    localStorage.removeItem('signatureDetails');
    
    // 重置状态
    setSeedWallet(null);
    setSeedAddress('');
    setSoulWallet(null);
    setSoulAddress('');
    setSignatureDetails(null);
    setIsCertified(false);
    setLinkedSoul('');
    setStatus('缓存已清除，请重新生成账户');
    
    // 通知父组件
    if (onSoulAccountCreated) {
      onSoulAccountCreated(null, '', false);
    }
  };

  // 添加重新认证函数
  const recertifySeedAccount = () => {
    // 清除认证状态
    setIsCertified(false);
    setLinkedSoul('');
    setSignatureDetails(null);
    
    // 清除本地存储中的认证数据
    localStorage.removeItem('signatureDetails');
    localStorage.removeItem('shadowSignatureDetails');
    
    // 重新检查认证状态
    checkCertificationStatus();
    
    setStatus('认证状态已重置，请重新认证根账户。');
  };

  // 重置认证状态
  const resetCertification = async () => {
    try {
      setStatus('正在重置认证状态...');
      
      // 调用后端重置接口
      await axios.post('http://localhost:3003/api/reset-certification', {
        seedAddress: seedAddress
      });
      
      // 清除本地存储
      localStorage.removeItem('signatureDetails');
      setSignatureDetails(null);
      setIsCertified(false);
      
      setStatus('认证状态已重置，您可以重新认证根账户');
    } catch (error) {
      console.error('重置认证状态失败:', error);
      setStatus('重置认证状态失败: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="seed-account">
      <h2>ZKBID 账户管理系统</h2>
      
      <div className="intro-section">
        <h3>项目介绍</h3>
        <p>
          ZKBID 是一个基于可链接环签名的匿名身份系统，允许用户创建匿名的根账户和灵魂账户，并在保护隐私的同时建立它们之间的关联。
        </p>
        <p>
          <strong>为什么需要认证根账户？</strong> 认证过程建立了根账户与灵魂账户之间的匿名但可验证的关联，使用户可以在不暴露身份的情况下证明账户所有权。
          这种机制可用于去中心化身份、隐私保护投票、匿名交易等场景。
        </p>
      </div>
      
      <div className="intro-section">
        <h3>为什么需要认证根账户？</h3>
        <p>
          在 ZKBID 系统中，认证根账户是建立匿名但可验证身份的关键步骤。通过认证过程：
        </p>
        <ul>
          <li><strong>匿名性保护</strong>：根账户与灵魂账户之间的关联对外界保持隐私，只有拥有者知道两者的关系。</li>
          <li><strong>防止重复认证</strong>：每个根账户只能认证一个灵魂账户，通过关键映像（Key Image）确保唯一性。</li>
          <li><strong>可验证性</strong>：虽然关联是匿名的，但系统可以验证灵魂账户确实与某个合法的根账户关联。</li>
          <li><strong>身份基础</strong>：认证后的灵魂账户可以用于后续的去中心化身份验证、隐私交易等场景。</li>
        </ul>
        <p>
          认证过程使用环签名技术，确保即使是区块链上的数据也无法泄露根账户与灵魂账户之间的具体对应关系。
        </p>
      </div>
      
      <div className="account-section">
        <h3>根账户 (Seed Account)</h3>
        {!seedWallet ? (
          <button onClick={createSeedAccount}>生成新的根账户</button>
        ) : (
          <div className="account-info">
            <p><strong>地址:</strong> {seedAddress}</p>
            <div className="balance-container">
              <p><strong>余额:</strong> {balance} ETH</p>
              <button 
                className="refresh-button" 
                onClick={refreshBalance}
                title="刷新余额"
              >
                🔄
              </button>
            </div>
            <p><strong>认证状态:</strong> <span className={isCertified ? "certified" : "not-certified"}>{isCertified ? '已认证' : '未认证'}</span></p>
            {isCertified && linkedSoul && (
              <p><strong>关联的灵魂账户:</strong> {linkedSoul}</p>
            )}
          </div>
        )}
      </div>
      
      <div className="account-section">
        <h3>灵魂账户 (Soul Account)</h3>
        {!soulWallet ? (
          <button onClick={generateSoulAccount}>生成新的灵魂账户</button>
        ) : (
          <div>
            <p><strong>地址:</strong> {soulAddress}</p>
          </div>
        )}
      </div>
      
      {seedWallet && soulWallet && !isCertified && (
        <div className="certification-section">
          <h3>根账户认证</h3>
          <p>
            通过环签名证明您拥有根账户和灵魂账户，将它们关联起来。这是使用其他功能的前提。
          </p>
          
          <div className="certification-options">
            <div className="option">
              <input 
                type="radio" 
                id="optimized" 
                name="certMethod" 
                checked={useOptimized} 
                onChange={() => setUseOptimized(true)} 
              />
              <label htmlFor="optimized">优化方式 (链下验证)</label>
            </div>
            <div className="option">
              <input 
                type="radio" 
                id="standard" 
                name="certMethod" 
                checked={!useOptimized} 
                onChange={() => setUseOptimized(false)} 
              />
              <label htmlFor="standard">标准方式 (链上验证)</label>
            </div>
          </div>
          
          <FormControlLabel
            control={
              <Switch
                checked={forceRecertify}
                onChange={(e) => setForceRecertify(e.target.checked)}
                color="primary"
              />
            }
            label="强制重新认证（无视缓存）"
          />
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={useOptimized ? certifySeedAccountOptimized : certifySeedAccount}
            disabled={parseFloat(balance) <= 0}
            className="certify-button"
          >
            {isCertified ? '重新认证根账户' : '认证根账户'}
          </Button>
          
          {parseFloat(balance) <= 0 && (
            <p className="warning">
              请向根账户地址发送一些 ETH 作为 gas 费，然后再进行认证。
            </p>
          )}
        </div>
      )}
      
      {processingStep && (
        <div className="processing-steps">
          <h4>处理步骤</h4>
          <div className="step-indicator">
            <div className={`step ${processingStep === '生成环签名' ? 'active' : ''}`}>生成环签名</div>
            <div className={`step ${processingStep === '链下验证' ? 'active' : ''}`}>链下验证</div>
            <div className={`step ${processingStep === '准备交易' ? 'active' : ''}`}>准备交易</div>
            <div className={`step ${processingStep === '发送交易' ? 'active' : ''}`}>发送交易</div>
            <div className={`step ${processingStep === '等待确认' ? 'active' : ''}`}>等待确认</div>
          </div>
        </div>
      )}
      
      {signatureDetails && (
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
                      {JSON.parse(signatureDetails.signature).c.map((c, index) => (
                        <div key={index} className="data-row">
                          <span className="index">{index + 1}.</span>
                          <span className="value">{c.substring(0, 20)}...</span>
                        </div>
                      ))}
                    </div>
                    
                    <p><strong>r 值:</strong></p>
                    <div className="scrollable">
                      {JSON.parse(signatureDetails.signature).r.map((r, index) => (
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
      
      {isCertified && (
        <div className="recertify-section">
          <button 
            onClick={recertifySeedAccount}
            className="recertify-button"
          >
            重新认证根账户
          </button>
          <p className="info">
            重新认证将清除当前的认证状态，您需要重新完成认证流程。
          </p>
        </div>
      )}
      
      {isCertified && soulWallet && (
        <div className="shadow-account-section">
          <h3>影子账户管理</h3>
          <p>
            您的根账户已成功认证并关联灵魂账户。现在您可以创建影子账户，通过环签名证明您拥有灵魂账户，而不泄露您的身份。
          </p>
          <ShadowAccount 
            soulWallet={soulWallet} 
            soulAddress={soulAddress} 
            signatureDetails={signatureDetails}
            key={`shadow-${soulAddress}`}
          />
        </div>
      )}
      
      {isCertified && (
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={resetCertification}
          style={{ marginTop: '10px' }}
        >
          重置认证状态
        </Button>
      )}
      
      <Button 
        variant="contained" 
        color="secondary" 
        onClick={() => {
          localStorage.removeItem('signatureDetails');
          console.log('已清除认证数据，请重新认证');
          setIsCertified(false);
          setSignatureDetails(null);
        }}
      >
        强制清除认证数据
      </Button>
    </div>
  );
}

export default SeedAccount;