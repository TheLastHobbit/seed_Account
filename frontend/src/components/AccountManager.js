import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './AccountManager.css';

function AccountManager({ onAccountsUpdated, seedAddress, soulAddress }) {
  const [seedWallet, setSeedWallet] = useState(null);
  const [soulWallet, setSoulWallet] = useState(null);
  const [localSeedAddress, setLocalSeedAddress] = useState(seedAddress || '');
  const [localSoulAddress, setLocalSoulAddress] = useState(soulAddress || '');
  const [seedBalance, setSeedBalance] = useState('0');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState(null);
  
  // 初始化
  useEffect(() => {
    const initProvider = async () => {
      // 使用公共 RPC 提供商
      const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/dbe77fbac5b8494e8f03b1099638abfd');
      setProvider(provider);
    };
    
    initProvider();
    
    // 从本地存储加载账户
    const loadStoredAccounts = async () => {
      try {
        // 加载根账户
        const storedSeed = localStorage.getItem('seedWallet');
        if (storedSeed) {
          const seedData = JSON.parse(storedSeed);
          const wallet = new ethers.Wallet(seedData.privateKey);
          setSeedWallet(wallet);
          setLocalSeedAddress(seedData.address);
        }
        
        // 加载影子账户
        const storedSoul = localStorage.getItem('soulWallet');
        if (storedSoul) {
          const soulData = JSON.parse(storedSoul);
          const wallet = new ethers.Wallet(soulData.privateKey);
          setSoulWallet(wallet);
          setLocalSoulAddress(soulData.address);
        }
      } catch (error) {
        console.error('加载存储的账户失败:', error);
      }
    };
    
    loadStoredAccounts();
  }, []);
  
  // 当props中的地址变化时，更新本地状态
  useEffect(() => {
    if (seedAddress) {
      setLocalSeedAddress(seedAddress);
    }
    if (soulAddress) {
      setLocalSoulAddress(soulAddress);
    }
  }, [seedAddress, soulAddress]);
  
  // 当根账户或提供商变化时，检查余额
  useEffect(() => {
    if (localSeedAddress && provider) {
      checkBalance();
    }
  }, [localSeedAddress, provider]);
  
  // 当账户变化时，通知父组件
  useEffect(() => {
    if (onAccountsUpdated) {
      onAccountsUpdated(localSeedAddress, localSoulAddress);
    }
  }, [localSeedAddress, localSoulAddress, onAccountsUpdated]);
  
  // 生成新的根账户
  const generateSeedAccount = () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setSeedWallet(wallet);
      setLocalSeedAddress(wallet.address);
      
      // 保存到本地存储
      localStorage.setItem('seedWallet', JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey
      }));
      
      setStatus('根账户生成成功！');
      
      // 通知父组件
      if (onAccountsUpdated) {
        onAccountsUpdated(wallet.address, localSoulAddress);
      }
    } catch (error) {
      console.error('生成根账户失败:', error);
      setStatus('生成根账户失败: ' + error.message);
    }
  };
  
  // 生成新的影子账户
  const generateSoulAccount = () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setSoulWallet(wallet);
      setLocalSoulAddress(wallet.address);
      
      // 保存到本地存储
      localStorage.setItem('soulWallet', JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey
      }));
      
      setStatus('影子账户生成成功！');
      
      // 通知父组件
      if (onAccountsUpdated) {
        onAccountsUpdated(localSeedAddress, wallet.address);
      }
    } catch (error) {
      console.error('生成影子账户失败:', error);
      setStatus('生成影子账户失败: ' + error.message);
    }
  };
  
  // 检查余额
  const checkBalance = async () => {
    if (!localSeedAddress || !provider) return;
    
    try {
      const balanceWei = await provider.getBalance(localSeedAddress);
      // 将 Wei 转换为 ETH，并保留 5 位小数
      const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(5);
      setSeedBalance(balanceEth);
    } catch (error) {
      console.error('获取余额失败:', error);
      setStatus('获取余额失败: ' + error.message);
    }
  };
  
  // 刷新余额
  const refreshBalance = () => {
    checkBalance();
    setStatus('余额已刷新');
  };
  
  return (
    <div className="account-manager">
      <div className="account-card seed-account">
        <h3>根账户 (Root Account)</h3>
        {!localSeedAddress ? (
          <button onClick={generateSeedAccount} className="generate-button">生成新的根账户</button>
        ) : (
          <div className="account-info">
            <p><strong>地址:</strong> {localSeedAddress}</p>
            <div className="balance-container">
              <p><strong>余额:</strong> {seedBalance} ETH</p>
              <button onClick={refreshBalance} className="refresh-button" title="刷新余额">
                🔄
              </button>
            </div>
            {parseFloat(seedBalance) <= 0 && (
              <p className="warning">
                请向此地址发送一些 ETH 作为 gas 费，以便进行认证操作。
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="account-card soul-account">
        <h3>影子账户 (Shadow Account)</h3>
        {!localSoulAddress ? (
          <button onClick={generateSoulAccount} className="generate-button">生成新的影子账户</button>
        ) : (
          <div className="account-info">
            <p><strong>地址:</strong> {localSoulAddress}</p>
          </div>
        )}
      </div>
      
      {status && <p className="status-message">{status}</p>}
    </div>
  );
}

export default AccountManager; 