import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="App-header">
      <h1>环签名隐私系统</h1>
      <p>基于区块链的高级隐私保护解决方案</p>
      
      <div className="button-container">
        <button 
          className="app-button primary"
          onClick={() => navigate('/seed-account')}
        >
          根账户管理
        </button>
        <button 
          className="app-button secondary"
          onClick={() => navigate('/shadow-account')}
        >
          影子账户管理
        </button>
      </div>
      
      <div className="card" style={{ marginTop: '40px', maxWidth: '600px' }}>
        <h2 className="card-title">环签名技术说明</h2>
        <div className="card-content">
          <p>
            环签名是一种密码学技术，允许用户代表一组可能的签名者进行签名，而不泄露实际签名者的身份。
            这种技术最早由Rivest、Shamir和Tauman在2001年提出。
          </p>
          <p style={{ marginTop: '10px' }}>
            在我们的系统中，环签名用于建立根账户、灵魂账户和影子账户之间的关联，
            同时保持交易的匿名性和不可追踪性。
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;