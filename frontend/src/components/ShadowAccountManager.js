import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './ShadowAccountManager.css';
import RingSignatureVisualizer from './RingSignatureVisualizer';

// ShadowLinker 合约 ABI
const contractABI = [
  "function linkShadowAccount(address shadowAddr, address[] calldata ring, bytes32 keyImage, bytes32[] calldata c, bytes32[] calldata r) external",
  "function linkShadowAccountOptimized(address shadowAddr, address[] calldata ring, bytes32 keyImage, bytes32[] calldata z, bytes32 finalHash, bytes32 c0) external",
  "function isLinked(address shadowAddr) external view returns (bool)",
  "function getSeedAccount(address shadowAddr) external view returns (address)",
  "event ShadowLinked(address indexed shadowAddr, address indexed seedAddr, bytes32 keyImage)"
];

// Sepolia 网络上部署的合约地址
const contractAddress = "0x226C796394190AdAE21Bf619EE4296cD1C38b277";

function ShadowAccountManager({ seedAddress, soulAddress, shadowAddress, certificationDetails, isCertified, isLinked, onShadowAccountUpdated }) {
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState(null);
  const [shadowWallet, setShadowWallet] = useState(null);
  const [localShadowAddress, setLocalShadowAddress] = useState(shadowAddress || '');
  const [processingStep, setProcessingStep] = useState('');
  const [shadowSignatureDetails, setShadowSignatureDetails] = useState(null);
  const [localIsLinked, setLocalIsLinked] = useState(isLinked);
  
  // 初始化
  useEffect(() => {
    const initProvider = async () => {
      // 使用公共 RPC 提供商
      const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/dbe77fbac5b8494e8f03b1099638abfd');
      setProvider(provider);
    };
    
    initProvider();
    
    // 从本地存储加载影子账户
    const loadStoredShadowAccount = () => {
      try {
        const storedShadow = localStorage.getItem('shadowWallet');
        if (storedShadow) {
          const shadowData = JSON.parse(storedShadow);
          const wallet = new ethers.Wallet(shadowData.privateKey);
          setShadowWallet(wallet);
          setLocalShadowAddress(shadowData.address);
        }
        
        // 加载影子账户签名详情
        const storedSignature = localStorage.getItem('shadowSignatureDetails');
        if (storedSignature) {
          const signatureData = JSON.parse(storedSignature);
          setShadowSignatureDetails(signatureData);
        }
      } catch (error) {
        console.error('加载存储的影子账户失败:', error);
      }
    };
    
    loadStoredShadowAccount();
  }, []);
  
  // 当 props 变化时更新本地状态
  useEffect(() => {
    if (shadowAddress) {
      setLocalShadowAddress(shadowAddress);
    }
    setLocalIsLinked(isLinked);
  }, [shadowAddress, isLinked]);
  
  // 当影子账户变化时，通知父组件
  useEffect(() => {
    if (onShadowAccountUpdated && localShadowAddress) {
      onShadowAccountUpdated(localShadowAddress, localIsLinked);
    }
  }, [localShadowAddress, localIsLinked, onShadowAccountUpdated]);
  
  // 生成新的影子账户
  const generateShadowAccount = () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setShadowWallet(wallet);
      setLocalShadowAddress(wallet.address);
      
      // 保存到本地存储
      localStorage.setItem('shadowWallet', JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey
      }));
      
      setStatus('影子账户生成成功！');
      
      // 通知父组件
      if (onShadowAccountUpdated) {
        onShadowAccountUpdated(wallet.address, localIsLinked);
      }
    } catch (error) {
      console.error('生成影子账户失败:', error);
      setStatus('生成影子账户失败: ' + error.message);
    }
  };
  
  // 关联影子账户
  const linkShadowAccount = async () => {
    // 声明 tx 变量
    let tx;
    
    try {
      // 检查是否已经关联
      if (localIsLinked) {
        setStatus('此影子账户已经关联，无需重复操作。');
        return;
      }
      
      // 检查是否已认证
      if (!isCertified) {
        setStatus('请先完成根账户认证，才能关联影子账户。');
        return;
      }
      
      setProcessingStep('生成环签名');
      setStatus('正在生成环签名...');
      
      // 获取根账户私钥
      let privateKey;
      try {
        privateKey = localStorage.getItem('seedPrivateKey');
        if (!privateKey) {
          privateKey = sessionStorage.getItem('seedPrivateKey');
        }
        
        if (!privateKey) {
          throw new Error('无法获取根账户私钥');
        }
        
        console.log('步骤1: 获取根账户私钥成功');
      } catch (error) {
        console.error('获取根账户私钥失败:', error);
        throw new Error('获取根账户私钥失败: ' + error.message);
      }
      
      // 调用后端API生成环签名
      let response;
      let signatureData;
      
      try {
        console.log('步骤2: 准备调用环签名生成API', {
          seedAddress: seedAddress,
          shadowAddress: localShadowAddress,
          ringLength: 5,
          hasPrivateKey: !!privateKey
        });
        
        // 确保包含所有必要参数
        response = await axios.post('http://localhost:3003/api/generate-shadow-signature', {
          seedAddress: seedAddress,
          seedPrivateKey: privateKey,
          shadowAddress: localShadowAddress,
          ringSize: 5
        });
        
        console.log('步骤2: 环签名生成成功', {
          ringLength: response.data.ring.length,
          keyImage: response.data.keyImage,
          signatureKeys: Object.keys(response.data.signature),
          signatureC: response.data.signature.c ? response.data.signature.c.length : 0,
          signatureR: response.data.signature.r ? response.data.signature.r.length : 0
        });
        
        signatureData = response.data.signature;
        
        console.log('步骤4: 交易参数准备完成', {
          signatureDataKeys: Object.keys(signatureData),
          hasC: !!signatureData.c,
          hasR: !!signatureData.r
        });
      } catch (error) {
        console.error('生成环签名失败:', error);
        if (error.response && error.response.data) {
          console.error('服务器返回的错误信息:', error.response.data);
        }
        throw new Error('生成环签名失败: ' + (error.response?.data?.error || error.message));
      }
      
      // 验证环签名
      setStatus('正在验证环签名...');
      try {
        console.log('步骤3: 准备验证环签名', {
          shadowAddress: localShadowAddress,
          ringLength: response.data.ring.length,
          keyImage: response.data.keyImage,
          signatureC: signatureData.c ? signatureData.c.length : 0,
          signatureR: signatureData.r ? signatureData.r.length : 0
        });
        
        const verifyResponse = await axios.post('http://localhost:3003/api/verify-shadow-signature', {
          seedAddress: seedAddress,
          shadowAddress: localShadowAddress,
          ring: response.data.ring,
          signature: signatureData,
          keyImage: response.data.keyImage
        });
        
        if (!verifyResponse.data.valid) {
          throw new Error('环签名验证失败: ' + verifyResponse.data.message);
        }
        
        console.log('步骤3: 环签名验证成功');
      } catch (error) {
        console.error('环签名验证失败:', error);
        if (error.response && error.response.data) {
          console.error('服务器返回的错误信息:', error.response.data);
        }
        throw new Error('环签名验证失败: ' + (error.response?.data?.error || error.message));
      }
      
      // 在提交交易前添加详细日志
      console.log('提交给合约的环签名数据:', {
        seedAddress,
        shadowAddress: localShadowAddress,
        ring: response.data.ring,
        keyImage: response.data.keyImage,
        signatureC: signatureData.c,
        signatureR: signatureData.r,
        signatureCLength: signatureData.c.length,
        signatureRLength: signatureData.r.length
      });
      
      // 确保所有参数都是正确的格式
      const formattedKeyImage = response.data.keyImage.startsWith('0x') ? response.data.keyImage : '0x' + response.data.keyImage;
      const formattedC = signatureData.c.map(c => c.startsWith('0x') ? c : '0x' + c);
      const formattedR = signatureData.r.map(r => r.startsWith('0x') ? r : '0x' + r);
      
      setProcessingStep('提交交易');
      setStatus('正在提交关联交易...');
      
      // 创建钱包实例
      const seedWallet = new ethers.Wallet(privateKey, provider);
      
      // 创建合约实例
      const contract = new ethers.Contract(contractAddress, contractABI, seedWallet);
      
      // 打印合约ABI，检查是否包含所有事件
      console.log('合约ABI:', contractABI);

      // 检查合约地址
      console.log('合约地址:', contractAddress);
      
      // 设置明确的gas限制，解决gas估算问题
      const gasLimit = ethers.utils.hexlify(500000); // 设置足够高的gas限制
      console.log('步骤5: 设置gas限制为', gasLimit);
      
      // 使用try-catch包装事件监听
      try {
        // 添加通用错误事件监听
        contract.on("error", (error) => {
          console.error('合约事件错误:', error);
        });
        
        // 监听所有事件
        contract.on("*", (event) => {
          console.log('检测到合约事件:', event);
        });
      } catch (error) {
        console.log('设置事件监听失败:', error.message);
        // 继续执行，不中断主流程
      }
      
      // 检查合约方法
      console.log('合约方法:', Object.keys(contract.functions));

      // 尝试调用合约方法
      try {
        // 检查合约是否有linkShadowAccount方法
        if ('linkShadowAccount' in contract.functions) {
          console.log('调用linkShadowAccount方法');
          
          tx = await contract.linkShadowAccount(
            localShadowAddress,
            response.data.ring,
            formattedKeyImage,
            formattedC,
            formattedR,
            { gasLimit }
          );
        }
        // 如果没有linkShadowAccount方法，尝试使用certifySeed方法
        else if ('certifySeed' in contract.functions) {
          console.log('调用certifySeed方法');
          
          // 查看certifySeed方法的参数
          const certifyMethod = contractABI.find(item => 
            typeof item === 'string' && item.includes('certifySeed(')
          );
          console.log('certifySeed方法定义:', certifyMethod);
          
          // 根据ABI调用方法
          tx = await contract.certifySeed(
            seedAddress,
            localShadowAddress,
            response.data.ring,
            formattedKeyImage,
            formattedC,
            formattedR,
            { gasLimit }
          );
        }
        else {
          throw new Error('合约中没有找到可用的方法');
        }
        
        console.log('交易已提交:', tx);
        
        setProcessingStep('等待确认');
        setStatus(`交易已提交，等待确认... 交易哈希: ${tx.hash}`);
        
        // 等待交易确认
        const receipt = await tx.wait();
        console.log('步骤8: 交易已确认', receipt);
        
        // 检查交易是否成功
        if (receipt.status === 1) {
          console.log('步骤9: 交易执行成功');
          
          // 检查合约中的关联状态
          const isLinkedInContract = await contract.isLinked(localShadowAddress);
          console.log('步骤10: 合约中的关联状态:', isLinkedInContract);
          
          setProcessingStep('完成关联');
          
          // 保存签名数据
          const shadowSignatureData = {
            ring: response.data.ring,
            keyImage: response.data.keyImage,
            signature: signatureData,
            timestamp: new Date().toISOString(),
            seedAddress: seedAddress,
            shadowAddress: localShadowAddress
          };
          
          setShadowSignatureDetails(shadowSignatureData);
          localStorage.setItem('shadowSignatureDetails', JSON.stringify(shadowSignatureData));
          
          // 更新状态
          setLocalIsLinked(true);
          setStatus('影子账户已成功关联根账户！');
          setProcessingStep('');
          
          // 通知父组件
          if (onShadowAccountUpdated) {
            onShadowAccountUpdated(localShadowAddress, true);
          }
        } else {
          throw new Error('交易已确认但执行失败');
        }
      } catch (error) {
        console.error('交易提交失败:', error);
        
        // 尝试使用更简单的参数调用
        try {
          console.log('尝试使用简化参数调用合约...');
          
          // 检查合约是否有certifySeed方法
          if ('certifySeed' in contract.functions) {
            // 获取方法参数数量
            const methodAbi = contract.interface.getFunction('certifySeed');
            console.log('certifySeed方法参数:', methodAbi.inputs);
            
            // 根据实际参数数量调用
            if (methodAbi.inputs.length === 5) {
              tx = await contract.certifySeed(
                seedAddress,
                localShadowAddress,
                response.data.ring,
                formattedKeyImage,
                formattedC,
                { gasLimit }
              );
            } else {
              tx = await contract.certifySeed(
                seedAddress,
                localShadowAddress,
                response.data.ring,
                formattedKeyImage,
                formattedC,
                formattedR,
                { gasLimit }
              );
            }
            
            console.log('简化参数交易已提交:', tx);
          } else {
            throw new Error('合约中没有找到可用的方法');
          }
        } catch (backupError) {
          console.error('备用方法也失败:', backupError);
          throw backupError;
        }
      }
    } catch (error) {
      console.error('关联影子账户失败:', error);
      setStatus('关联失败: ' + error.message);
      setProcessingStep('');
    }
  };
  
  // 解除关联
  const unlinkShadowAccount = () => {
    // 清除关联状态
    setLocalIsLinked(false);
    setShadowSignatureDetails(null);
    
    // 清除本地存储中的关联数据
    localStorage.removeItem('shadowSignatureDetails');
    
    // 通知父组件
    if (onShadowAccountUpdated) {
      onShadowAccountUpdated(localShadowAddress, false);
    }
    
    setStatus('影子账户关联已解除，您可以重新关联或创建新的影子账户。');
  };
  
  useEffect(() => {
    if (shadowWallet) {
      console.log('影子钱包已设置:', shadowWallet.address);
    }
  }, [shadowWallet]);
  
  return (
    <div className="shadow-account-manager">
      <div className="shadow-account-section">
        <h3>影子账户</h3>
        {!localShadowAddress ? (
          <div className="shadow-account-create">
            <p>影子账户是一个普通的以太坊账户，可以通过环签名与您的根账户关联，但不会泄露您的身份。</p>
            <button 
              onClick={generateShadowAccount} 
              className="generate-button"
            >
              生成新的影子账户
            </button>
          </div>
        ) : (
          <div className="shadow-account-info">
            <p><strong>影子账户地址:</strong> {localShadowAddress}</p>
            
            {!localIsLinked ? (
              <div className="link-section">
                <p>您需要将此影子账户与您的根账户关联，才能使用它进行匿名交易。</p>
                <button 
                  onClick={linkShadowAccount} 
                  className="link-button"
                  disabled={!isCertified || !certificationDetails}
                >
                  关联影子账户
                </button>
                
                {!isCertified && (
                  <p className="warning">请先完成根账户认证，才能关联影子账户。</p>
                )}
              </div>
            ) : (
              <div className="linked-status">
                <div className="status-header">
                  <h4>关联状态</h4>
                  <span className="linked-badge">已关联</span>
                </div>
                <p>您的影子账户已成功关联根账户。</p>
                <p>现在您可以使用此影子账户进行交易，而不会泄露您的根账户身份。</p>
                
                <button 
                  onClick={unlinkShadowAccount}
                  className="unlink-button"
                >
                  解除关联
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {processingStep && (
        <div className="processing-steps">
          <h4>处理步骤</h4>
          <div className="step-indicator">
            <div className={`step ${processingStep === '生成环签名' ? 'active' : ''}`}>生成环签名</div>
            <div className={`step ${processingStep === '提交交易' ? 'active' : ''}`}>提交交易</div>
            <div className={`step ${processingStep === '等待确认' ? 'active' : ''}`}>等待确认</div>
            <div className={`step ${processingStep === '完成关联' ? 'active' : ''}`}>完成关联</div>
          </div>
        </div>
      )}
      
      {status && <p className="status-message">{status}</p>}
      
      {localIsLinked && shadowSignatureDetails && (
        <div className="usage-guide">
          <h3>如何使用您的影子账户</h3>
          <ol>
            <li>
              <strong>导入到钱包：</strong> 您可以将影子账户的私钥导入到任何以太坊钱包中（如 MetaMask）。
            </li>
            <li>
              <strong>进行交易：</strong> 使用影子账户进行交易，就像使用普通以太坊账户一样。
            </li>
            <li>
              <strong>保持匿名：</strong> 由于影子账户与您的根账户之间的关联是通过环签名建立的，没有人能够确定您是环中的哪个成员。
            </li>
            <li>
              <strong>安全提示：</strong> 请妥善保管您的影子账户私钥，不要将其泄露给他人。
            </li>
          </ol>
          
          <div className="private-key-section">
            <h4>影子账户私钥</h4>
            <p className="warning">
              警告：私钥是访问您账户的唯一凭证，请妥善保管，不要泄露给他人。
            </p>
            <button 
              onClick={() => {
                const shadowData = JSON.parse(localStorage.getItem('shadowWallet'));
                if (shadowData) {
                  alert(`您的影子账户私钥：${shadowData.privateKey}\n\n请妥善保管，不要泄露给他人！`);
                }
              }}
              className="show-key-button"
            >
              显示私钥
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShadowAccountManager; 