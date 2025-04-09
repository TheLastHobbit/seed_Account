import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

const ShadowAccountPage = ({ seedWallet, soulWallet, isCertified }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [shadowWallet, setShadowWallet] = useState(null);
  const [shadowAccounts, setShadowAccounts] = useState([]);
  
  // 加载已保存的影子账户
  useEffect(() => {
    const storedShadowAccounts = localStorage.getItem('shadowAccounts');
    if (storedShadowAccounts) {
      try {
        setShadowAccounts(JSON.parse(storedShadowAccounts));
      } catch (error) {
        console.error('解析影子账户数据失败:', error);
      }
    }
  }, []);
  
  // 创建影子账户
  const createShadowAccount = async () => {
    if (!isCertified) {
      setStatus('请先完成根账户认证');
      navigate('/seed-account');
      return;
    }
    
    setLoading(true);
    setStatus('正在创建影子账户...');
    
    try {
      // 创建随机钱包作为影子账户
      const wallet = ethers.Wallet.createRandom();
      const walletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };
      
      setShadowWallet(walletInfo);
      setStatus('影子账户创建成功！');
    } catch (error) {
      console.error('创建影子账户失败:', error);
      setStatus('创建影子账户失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 关联影子账户
  const linkShadowAccount = async () => {
    if (!shadowWallet) {
      setStatus('请先创建影子账户');
      return;
    }
    
    setLoading(true);
    setStatus('正在生成环签名...');
    
    try {
      // 模拟环签名生成过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('正在发送交易...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('交易已发送，等待确认...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 添加到影子账户列表
      const newAccount = {
        address: shadowWallet.address,
        privateKey: shadowWallet.privateKey,
        createdAt: new Date().toISOString(),
        keyImage: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      };
      
      const updatedAccounts = [...shadowAccounts, newAccount];
      setShadowAccounts(updatedAccounts);
      
      // 保存到本地存储
      localStorage.setItem('shadowAccounts', JSON.stringify(updatedAccounts));
      
      setStatus('影子账户关联成功！');
      setShadowWallet(null); // 重置当前影子账户
    } catch (error) {
      console.error('关联影子账户失败:', error);
      setStatus('关联影子账户失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 复制地址到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatus('地址已复制到剪贴板');
    setTimeout(() => setStatus(''), 2000);
  };
  
  if (!isCertified) {
    return (
      <div className="App-header">
        <h1>影子账户管理</h1>
        <div className="card">
          <h2 className="card-title">未认证</h2>
          <div className="card-content">
            <p>您需要先创建根账户并完成认证，才能管理影子账户。</p>
            <button 
              className="app-button primary" 
              onClick={() => navigate('/seed-account')}
              style={{ marginTop: '20px' }}
            >
              前往根账户管理
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="App-header" style={{ alignItems: 'center' }}>
      <h1>影子账户管理</h1>
      
      <div className="card">
        <h2 className="card-title">创建新的影子账户</h2>
        <div className="card-content">
          <p>影子账户是与您的根账户关联的匿名账户。通过环签名技术，这种关联在区块链上是不可追踪的。</p>
          
          {shadowWallet ? (
            <div className="account-info">
              <h3>新影子账户信息</h3>
              <p><strong>地址:</strong> <span className="account-address">{shadowWallet.address}</span></p>
              <p><strong>私钥:</strong> <span className="account-address">******************************</span></p>
              <p><small>请安全保存您的私钥和助记词，不要分享给任何人！</small></p>
              
              <button 
                className="app-button primary" 
                onClick={linkShadowAccount}
                disabled={loading}
                style={{ marginTop: '15px' }}
              >
                {loading && <span className="loading"></span>}
                关联影子账户
              </button>
            </div>
          ) : (
            <button 
              className="app-button secondary" 
              onClick={createShadowAccount}
              disabled={loading}
            >
              {loading && <span className="loading"></span>}
              创建影子账户
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
      
      <div className="card">
        <h2 className="card-title">我的影子账户</h2>
        <div className="card-content">
          {shadowAccounts.length > 0 ? (
            <div className="shadow-account-list">
              {shadowAccounts.map((account, index) => (
                <div key={index} className="shadow-account-item">
                  <h3>影子账户 #{index + 1}</h3>
                  <p><strong>地址:</strong> <span className="account-address">{account.address}</span></p>
                  <p><strong>创建时间:</strong> {new Date(account.createdAt).toLocaleString('zh-CN')}</p>
                  <p><strong>密钥映像:</strong> {account.keyImage.substring(0, 10)}...</p>
                  
                  <button 
                    className="app-button primary" 
                    onClick={() => copyToClipboard(account.address)}
                    style={{ marginTop: '10px', padding: '5px 10px', fontSize: '14px' }}
                  >
                    复制地址
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>您还没有创建任何影子账户</p>
          )}
        </div>
      </div>
      
      <div className="card">
        <h2 className="card-title">环签名交易</h2>
        <div className="card-content">
          <p>
            使用影子账户进行交易时，系统会自动生成环签名，确保交易的匿名性和不可追踪性。
            每次交易都会使用不同的环和不同的密钥映像，进一步增强隐私保护。
          </p>
          
          <button 
            className="app-button secondary" 
            onClick={() => navigate('/')}
            style={{ marginTop: '15px' }}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShadowAccountPage; 