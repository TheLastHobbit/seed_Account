import React, { useState, useEffect } from 'react';
import './App.css';
import AccountManager from './components/AccountManager';
import CertificationManager from './components/CertificationManager';
import ShadowAccountManager from './components/ShadowAccountManager';

function App() {
  const [seedAddress, setSeedAddress] = useState('');
  const [soulAddress, setSoulAddress] = useState('');
  const [shadowAddress, setShadowAddress] = useState('');
  const [isCertified, setIsCertified] = useState(false);
  const [certificationDetails, setCertificationDetails] = useState(null);
  const [isLinked, setIsLinked] = useState(false);
  
  // 初始化时从本地存储加载数据
  useEffect(() => {
    // 加载账户地址
    const storedSeed = localStorage.getItem('seedWallet');
    if (storedSeed) {
      const seedData = JSON.parse(storedSeed);
      setSeedAddress(seedData.address);
    }
    
    const storedSoul = localStorage.getItem('soulWallet');
    if (storedSoul) {
      const soulData = JSON.parse(storedSoul);
      setSoulAddress(soulData.address);
    }
    
    const storedShadow = localStorage.getItem('shadowWallet');
    if (storedShadow) {
      const shadowData = JSON.parse(storedShadow);
      setShadowAddress(shadowData.address);
    }
    
    // 加载认证状态
    const storedCertification = localStorage.getItem('certificationDetails');
    if (storedCertification) {
      const certData = JSON.parse(storedCertification);
      setCertificationDetails(certData);
      setIsCertified(true);
    }
    
    // 加载关联状态
    const storedShadowSignature = localStorage.getItem('shadowSignatureDetails');
    if (storedShadowSignature) {
      setIsLinked(true);
    }
  }, []);
  
  // 处理账户更新
  const handleAccountsUpdated = (seed, soul) => {
    setSeedAddress(seed);
    setSoulAddress(soul);
  };
  
  // 处理认证状态更新
  const handleCertificationUpdated = (certified, details) => {
    setIsCertified(certified);
    setCertificationDetails(details);
  };
  
  // 处理影子账户更新
  const handleShadowAccountUpdated = (shadow, linked) => {
    setShadowAddress(shadow);
    setIsLinked(linked);
  };
  
  // 重置所有数据
  const resetAllData = () => {
    // 清除本地存储
    localStorage.removeItem('seedWallet');
    localStorage.removeItem('soulWallet');
    localStorage.removeItem('shadowWallet');
    localStorage.removeItem('certificationDetails');
    localStorage.removeItem('shadowSignatureDetails');
    
    // 重置状态
    setSeedAddress('');
    setSoulAddress('');
    setShadowAddress('');
    setIsCertified(false);
    setCertificationDetails(null);
    setIsLinked(false);
    
    alert('所有数据已重置');
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>根账户认证与影子账户关联系统</h1>
        <button onClick={resetAllData} className="reset-button">重置所有数据</button>
      </header>
      
      <main className="App-main">
        <section className="section">
          <h2>第一步：创建账户</h2>
          <AccountManager 
            onAccountsUpdated={handleAccountsUpdated}
            seedAddress={seedAddress}
            soulAddress={soulAddress}
          />
        </section>
        
        <section className="section">
          <h2>第二步：根账户认证</h2>
          <CertificationManager 
            seedAddress={seedAddress}
            soulAddress={soulAddress}
            isCertified={isCertified}
            onCertificationUpdated={handleCertificationUpdated}
          />
        </section>
        
        <section className="section">
          <h2>第三步：影子账户关联</h2>
          <ShadowAccountManager 
            seedAddress={seedAddress}
            soulAddress={soulAddress}
            shadowAddress={shadowAddress}
            certificationDetails={certificationDetails}
            isCertified={isCertified}
            isLinked={isLinked}
            onShadowAccountUpdated={handleShadowAccountUpdated}
          />
        </section>
      </main>
      
      <footer className="App-footer">
        <p>© 2023 根账户认证系统 | 基于环签名技术</p>
      </footer>
    </div>
  );
}

export default App;
