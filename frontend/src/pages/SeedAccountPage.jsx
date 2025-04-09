import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

const SeedAccountPage = ({ 
  seedWallet, 
  soulWallet, 
  isCertified,
  updateSeedWallet,
  updateSoulWallet,
  updateCertification
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [balance, setBalance] = useState('0');
  const [hasGas, setHasGas] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  
  // 设置以太坊提供者
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY'); // 替换为您的Infura Key或其他RPC提供者
  
  // 检查余额
  useEffect(() => {
    const checkBalance = async () => {
      if (seedWallet && seedWallet.address) {
        try {
          setCheckingBalance(true);
          const balanceWei = await provider.getBalance(seedWallet.address);
          const balanceEth = ethers.utils.formatEther(balanceWei);
          setBalance(balanceEth);
          
          // 检查是否有足够的gas费（例如，0.01 ETH）
          const hasEnoughGas = parseFloat(balanceEth) >= 0.01;
          setHasGas(hasEnoughGas);
          
          setCheckingBalance(false);
        } catch (error) {
          console.error('检查余额失败:', error);
          setCheckingBalance(false);
        }
      }
    };
    
    checkBalance();
    
    // 设置定时器，每30秒检查一次余额
    const intervalId = setInterval(checkBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [seedWallet, provider]);
  
  // 创建根账户
  const createSeedAccount = async () => {
    setLoading(true);
    setStatus('正在创建根账户...');
    
    try {
      // 创建随机钱包
      const wallet = ethers.Wallet.createRandom();
      const walletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };
      
      updateSeedWallet(walletInfo);
      setStatus('根账户创建成功！请向此账户转入一些ETH作为gas费');
    } catch (error) {
      console.error('创建根账户失败:', error);
      setStatus('创建根账户失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 创建灵魂账户
  const createSoulAccount = async () => {
    if (!seedWallet) {
      setStatus('请先创建根账户');
      return;
    }
    
    setLoading(true);
    setStatus('正在创建灵魂账户...');
    
    try {
      // 创建随机钱包作为灵魂账户
      const wallet = ethers.Wallet.createRandom();
      const walletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };
      
      updateSoulWallet(walletInfo);
      setStatus('灵魂账户创建成功！');
    } catch (error) {
      console.error('创建灵魂账户失败:', error);
      setStatus('创建灵魂账户失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 手动刷新余额
  const refreshBalance = async () => {
    if (!seedWallet || !seedWallet.address) {
      setStatus('请先创建根账户');
      return;
    }
    
    setCheckingBalance(true);
    setStatus('正在检查余额...');
    
    try {
      const balanceWei = await provider.getBalance(seedWallet.address);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      setBalance(balanceEth);
      
      // 检查是否有足够的gas费（例如，0.01 ETH）
      const hasEnoughGas = parseFloat(balanceEth) >= 0.01;
      setHasGas(hasEnoughGas);
      
      setStatus(hasEnoughGas 
        ? '余额充足，可以进行认证操作' 
        : `当前余额: ${balanceEth} ETH，请转入至少0.01 ETH作为gas费`);
      
      setCheckingBalance(false);
    } catch (error) {
      console.error('检查余额失败:', error);
      setStatus('检查余额失败: ' + error.message);
      setCheckingBalance(false);
    }
  };
  
  // 认证根账户
  const certifySeedAccount = async () => {
    if (!seedWallet || !soulWallet) {
      setStatus('请先创建根账户和灵魂账户');
      return;
    }
    
    if (!hasGas) {
      setStatus('余额不足，请向根账户转入至少0.01 ETH作为gas费');
      return;
    }
    
    setLoading(true);
    setStatus('正在生成环签名...');
    
    try {
      // 模拟环签名生成过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('正在发送交易...');
      
      // 创建钱包实例
      const wallet = new ethers.Wallet(seedWallet.privateKey, provider);
      
      // 模拟发送交易
      // 在实际应用中，这里应该调用智能合约的认证方法
      setStatus('交易已发送，等待确认...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟认证成功
      const certificationDetails = {
        seedAddress: seedWallet.address,
        soulAddress: soulWallet.address,
        timestamp: Date.now(),
        ringSize: 10,
        keyImage: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      };
      
      updateCertification(true, certificationDetails);
      setStatus('根账户认证成功！');
    } catch (error) {
      console.error('认证根账户失败:', error);
      setStatus('认证根账户失败: ' + error.message);
      updateCertification(false);
    } finally {
      setLoading(false);
    }
  };
  
  // 重置认证状态
  const resetCertification = () => {
    updateCertification(false);
    setStatus('认证状态已重置');
  };
  
  return (
    <div className="App-header" style={{ alignItems: 'center' }}>
      <h1>根账户管理</h1>
      
      <div className="card">
        <h2 className="card-title">创建根账户</h2>
        <div className="card-content">
          <p>根账户是您在环签名系统中的身份基础。创建根账户后，您需要创建灵魂账户并完成认证。</p>
          
          {seedWallet ? (
            <div className="account-info">
              <h3>根账户信息</h3>
              <p><strong>地址:</strong> <span className="account-address">{seedWallet.address}</span></p>
              <p><strong>私钥:</strong> <span className="account-address">******************************</span></p>
              <p><small>请安全保存您的私钥和助记词，不要分享给任何人！</small></p>
              
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(0, 160, 255, 0.1)', borderRadius: '4px' }}>
                <p><strong>当前余额:</strong> {balance} ETH</p>
                <p><strong>状态:</strong> {hasGas ? '余额充足，可以进行认证' : '请向此账户转入至少0.01 ETH作为gas费'}</p>
                <button 
                  className="app-button primary" 
                  onClick={refreshBalance}
                  disabled={checkingBalance}
                  style={{ marginTop: '10px', padding: '5px 10px', fontSize: '14px' }}
                >
                  {checkingBalance ? <span className="loading"></span> : null}
                  刷新余额
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="app-button primary" 
              onClick={createSeedAccount}
              disabled={loading}
            >
              {loading && <span className="loading"></span>}
              创建根账户
            </button>
          )}
          
          <div className="divider"></div>
          
          <h3>创建灵魂账户</h3>
          <p>灵魂账户将与您的根账户关联，用于生成环签名。</p>
          
          {soulWallet ? (
            <div className="account-info">
              <h3>灵魂账户信息</h3>
              <p><strong>地址:</strong> <span className="account-address">{soulWallet.address}</span></p>
              <p><strong>私钥:</strong> <span className="account-address">******************************</span></p>
              <p><small>请安全保存您的私钥和助记词，不要分享给任何人！</small></p>
            </div>
          ) : (
            <button 
              className="app-button secondary" 
              onClick={createSoulAccount}
              disabled={loading || !seedWallet}
            >
              {loading && <span className="loading"></span>}
              创建灵魂账户
            </button>
          )}
          
          <div className="divider"></div>
          
          <h3>认证根账户</h3>
          <p>通过环签名技术，证明您同时拥有根账户和灵魂账户，而不泄露您的身份。</p>
          
          <button 
            className="app-button primary" 
            onClick={certifySeedAccount}
            disabled={loading || !seedWallet || !soulWallet || isCertified || !hasGas}
            style={{ marginRight: '10px' }}
          >
            {loading && <span className="loading"></span>}
            认证根账户
          </button>
          
          {isCertified && (
            <button 
              className="app-button secondary" 
              onClick={resetCertification}
            >
              重置认证状态
            </button>
          )}
          
          {status && (
            <div className={`status-message ${
              status.includes('成功') ? 'status-success' : 
              status.includes('失败') ? 'status-error' : 'status-info'
            }`}>
              {status}
            </div>
          )}
        </div>
      </div>
      
      {isCertified && (
        <div className="card">
          <h2 className="card-title">认证详情</h2>
          <div className="card-content">
            <p><strong>根账户地址:</strong> <span className="account-address">{seedWallet.address}</span></p>
            <p><strong>灵魂账户地址:</strong> <span className="account-address">{soulWallet.address}</span></p>
            <p><strong>认证时间:</strong> {new Date().toLocaleString('zh-CN')}</p>
            <p><strong>环大小:</strong> 10</p>
            
            <div className="divider"></div>
            
            <button 
              className="app-button secondary" 
              onClick={() => navigate('/shadow-account')}
            >
              前往创建影子账户
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeedAccountPage; 