const express = require('express');
const { ec: EC } = require('elliptic');
const crypto = require('crypto');
const BN = require('bn.js');
const router = express.Router();
const { generateRingSignature, verifyRingSignature, generateRingSignatureProof } = require('../utils/ringSignature');
const { ethers } = require('ethers');
const authenticationStore = require('../utils/authenticationStore');

const curve = new EC('secp256k1');

// 模拟公钥池
class PublicKeyPool {
    constructor() {
        this.keyPairs = []; // 存储完整的密钥对
        this.initializePool();
    }

    generateKeyPairs(count) {
        console.log(`生成 ${count} 个新的密钥对`);
        const keyPairs = [];
        for (let i = 0; i < count; i++) {
            try {
                const keyPair = curve.genKeyPair();
                const publicKey = keyPair.getPublic().encode('hex');
                // 生成一个模拟的以太坊地址
                const address = '0x' + crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 40);
                keyPairs.push({
                    keyPair,
                    publicKey,
                    address
                });
            } catch (error) {
                console.error('生成密钥对失败:', error);
                // 继续生成下一个
            }
        }
        this.keyPairs = [...this.keyPairs, ...keyPairs];
        console.log(`现在池中有 ${this.keyPairs.length} 个密钥对`);
        return keyPairs;
    }

    initializePool(minSize = 100) {
        console.log(`初始化公钥池，最小大小: ${minSize}`);
        if (this.keyPairs.length < minSize) {
            this.generateKeyPairs(minSize - this.keyPairs.length);
        }
    }

    getRandomKeys(count) {
        console.log(`请求 ${count} 个随机密钥`);
        this.initializePool(count + 10); // 确保池中有足够的密钥对
        
        const result = [];
        const available = [...this.keyPairs];
        
        for (let i = 0; i < Math.min(count, available.length); i++) {
            const index = Math.floor(Math.random() * available.length);
            result.push(available[index]);
            available.splice(index, 1);
        }
        
        console.log(`返回 ${result.length} 个随机密钥`);
        return result;
    }
}

const publicKeyPool = new PublicKeyPool();

// 生成环签名
router.post('/generate', async (req, res) => {
  try {
    const { signerAddress, message, useOptimized } = req.body;
    
    if (!signerAddress || !message) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 生成环签名
    const ringSize = 5; // 环大小
    const result = await generateRingSignature(signerAddress, message, ringSize, useOptimized);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('生成环签名失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '生成环签名失败'
    });
  }
});

// 验证环签名
router.post('/verify', async (req, res) => {
  try {
    const { ring, keyImage, signature, message, useOptimized } = req.body;
    
    if (!ring || !keyImage || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 验证环签名
    const isValid = await verifyRingSignature(ring, keyImage, signature, message, useOptimized);
    
    res.json({
      success: true,
      data: {
        isValid
      }
    });
  } catch (error) {
    console.error('验证环签名失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '验证环签名失败'
    });
  }
});

// 生成根账户认证环签名
router.post('/generate-signature', async (req, res) => {
  try {
    const { seedAddress, seedPrivateKey, soulAddress, ring, nonce } = req.body;
    
    // 记录请求信息，包括nonce
    console.log('后端步骤1: 接收到生成根账户认证环签名请求', {
      hasSeedAddress: !!seedAddress,
      hasSoulAddress: !!soulAddress,
      hasRing: !!ring,
      hasNonce: !!nonce,
      nonce: nonce,
      ringLength: ring ? ring.length : 0
    });
    
    if (!seedAddress || !seedPrivateKey || !soulAddress) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 添加响应头，禁止缓存
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // 生成环
    const ringSize = 5; // 环大小
    let ringToUse = ring || [
      seedAddress,
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012',
      '0x4567890123456789012345678901234567890123'
    ];
    
    console.log('后端步骤2: 准备环', {
      ringLength: ringToUse.length,
      firstAddress: ringToUse[0],
      lastAddress: ringToUse[ringToUse.length - 1]
    });
    
    // 确保环中包含签名者
    const signerIndex = ringToUse.findIndex(addr => 
      addr.toLowerCase() === seedAddress.toLowerCase());
    
    if (signerIndex === -1) {
      console.log('后端步骤2.1: 签名者不在环中，将其添加到环中');
      ringToUse[0] = seedAddress; // 将签名者放在环的第一个位置
    } else {
      console.log('后端步骤2.1: 签名者在环中，索引为', signerIndex);
    }
    
    // 生成环签名
    console.log('后端步骤3: 开始生成环签名');
    const signature = generateRingSignature(
      seedPrivateKey,
      seedAddress,
      soulAddress,
      ringToUse,
      signerIndex !== -1 ? signerIndex : 0
    );
    
    // 确保生成密钥映像
    if (!signature.keyImage) {
      console.log('后端步骤3.1: 生成密钥映像');
      signature.keyImage = '0x' + crypto.createHash('sha256')
        .update(seedPrivateKey + seedAddress)
        .digest('hex');
    }
    
    console.log('后端步骤3.2: 环签名生成成功', {
      ringLength: ringToUse.length,
      keyImage: signature.keyImage,
      signatureKeys: Object.keys(signature),
      cLength: signature.c ? signature.c.length : 0,
      rLength: signature.r ? signature.r.length : 0
    });
    
    // 验证生成的签名
    console.log('后端步骤4: 验证生成的环签名');
    const isValid = verifyRingSignature(soulAddress, ringToUse, signature);
    
    if (!isValid) {
      console.log('后端步骤4.1: 环签名验证失败');
      return res.status(500).json({ error: '生成的环签名验证失败' });
    }
    
    console.log('后端步骤4.1: 环签名验证成功');
    
    // 添加一个唯一的认证标识符
    const authToken = crypto.randomBytes(16).toString('hex');
    
    // 在后端存储认证信息
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .substr(0, 19);

    // 这里使用修改后的set方法
    const storeResult = authenticationStore.set(seedAddress, {
      soulAddress,
      authToken,
      timestamp: now.getTime(),
      beijingTime: beijingTime,
      ring: ringToUse,
      keyImage: signature.keyImage
    });
    
    console.log('后端步骤5: 生成认证令牌并存储认证信息', {
      seedAddress,
      soulAddress,
      authToken: authToken.substring(0, 8) + '...',
      beijingTime: beijingTime,
      storeSuccess: storeResult
    });
    
    // 确保返回的签名对象包含必要的字段
    const responseSignature = {
      c: signature.c || [],
      r: signature.r || []
    };
    
    // 打印详细的响应内容
    console.log('后端步骤6: 返回响应', {
      ringLength: ringToUse.length,
      keyImage: signature.keyImage,
      signatureC: responseSignature.c.length,
      signatureR: responseSignature.r.length,
      hasAuthToken: !!authToken
    });
    
    // 添加调试信息 - 检查认证存储
    console.log('认证存储状态:', authenticationStore.debug());
    
    res.json({
      ring: ringToUse,
      keyImage: signature.keyImage,
      signature: responseSignature,
      authToken, // 返回认证令牌
      valid: true
    });
  } catch (error) {
    console.error('生成根账户认证环签名失败:', error);
    res.status(500).json({ error: '生成环签名失败: ' + error.message });
  }
});

// 验证认证状态
router.post('/verify-certification', (req, res) => {
  try {
    const { seedAddress, authToken } = req.body;
    
    console.log('收到验证认证请求:', {
      seedAddress,
      authToken: authToken ? authToken.substring(0, 8) + '...' : null
    });
    
    if (!seedAddress || !authToken) {
      return res.status(400).json({ 
        isCertified: false, 
        error: '缺少必要参数' 
      });
    }
    
    // 获取认证信息
    const authInfo = authenticationStore.get(seedAddress);
    
    console.log('认证信息查询结果:', {
      found: !!authInfo,
      hasSoulAddress: authInfo ? !!authInfo.soulAddress : false,
      hasAuthToken: authInfo ? !!authInfo.authToken : false
    });
    
    if (!authInfo || authInfo.authToken !== authToken) {
      return res.json({ 
        isCertified: false,
        message: '认证信息无效或已过期'
      });
    }
    
    // 认证有效
    res.json({
      isCertified: true,
      soulAddress: authInfo.soulAddress,
      message: '认证有效'
    });
  } catch (error) {
    console.error('验证认证状态失败:', error);
    res.status(500).json({ 
      isCertified: false, 
      error: '验证失败: ' + error.message 
    });
  }
});

// 生成影子账户环签名
router.post('/generate-shadow-signature', async (req, res) => {
  try {
    const { seedAddress, seedPrivateKey, shadowAddress, ringSize = 5 } = req.body;
    
    // 验证必要参数
    if (!seedAddress || !seedPrivateKey || !shadowAddress) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    console.log('后端步骤1: 接收到生成影子账户环签名请求', {
      hasSeedAddress: !!seedAddress,
      hasShadowAddress: !!shadowAddress,
      hasRing: !!ringSize,
      ringLength: ringSize
    });
    
    // 验证提供的环是否有效
    let ringToUse = ringSize ? [...Array(ringSize).fill(seedAddress)] : [
      seedAddress,
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012',
      '0x4567890123456789012345678901234567890123'
    ];
    
    console.log('后端步骤2: 使用提供的环', {
      ringLength: ringToUse.length,
      firstAddress: ringToUse[0],
      lastAddress: ringToUse[ringToUse.length - 1]
    });
    
    // 签名者在环中的索引
    const signerIndex = ringToUse.findIndex(addr => 
      addr.toLowerCase() === seedAddress.toLowerCase());
    
    if (signerIndex === -1) {
      console.log('后端步骤2.1: 签名者不在环中，将其添加到环中');
      ringToUse[0] = seedAddress; // 将签名者放在环的第一个位置
    } else {
      console.log('后端步骤2.1: 签名者在环中，索引为', signerIndex);
    }
    
    // 生成环签名
    console.log('后端步骤3: 开始生成环签名');
    const signature = generateRingSignature(
      seedPrivateKey,
      seedAddress,
      shadowAddress,
      ringToUse,
      signerIndex !== -1 ? signerIndex : 0
    );
    
    // 确保生成密钥映像
    if (!signature.keyImage) {
      console.log('后端步骤3.1: 生成密钥映像');
      signature.keyImage = '0x' + crypto.createHash('sha256')
        .update(seedPrivateKey + seedAddress + shadowAddress)
        .digest('hex');
    }
    
    console.log('后端步骤3.2: 环签名生成成功', {
      ringLength: ringToUse.length,
      keyImage: signature.keyImage,
      signatureKeys: Object.keys(signature),
      cLength: signature.c ? signature.c.length : 0,
      rLength: signature.r ? signature.r.length : 0
    });
    
    // 验证生成的签名
    console.log('后端步骤4: 验证生成的环签名');
    const isValid = verifyRingSignature(shadowAddress, ringToUse, signature);
    
    if (!isValid) {
      console.log('后端步骤4.1: 环签名验证失败');
      return res.status(500).json({ error: '生成的环签名验证失败' });
    }
    
    console.log('后端步骤4.1: 环签名验证成功');
    
    // 确保返回的签名对象包含必要的字段
    const responseSignature = {
      c: signature.c || [],
      r: signature.r || []
    };
    
    // 打印详细的响应内容
    console.log('后端步骤5: 返回响应', {
      ringLength: ringToUse.length,
      keyImage: signature.keyImage,
      signatureC: responseSignature.c.length,
      signatureR: responseSignature.r.length
    });
    
    // 在后端存储影子账户关联信息
    const seedAuthInfo = authenticationStore.get(seedAddress);
    if (seedAuthInfo) {
      seedAuthInfo.shadowAddress = shadowAddress;
      seedAuthInfo.shadowKeyImage = signature.keyImage;
      seedAuthInfo.shadowTimestamp = Date.now();
      authenticationStore.set(seedAddress, seedAuthInfo);
      
      console.log('后端步骤5.1: 更新认证存储', {
        seedAddress,
        shadowAddress,
        hasAuthInfo: true
      });
    } else {
      console.log('后端步骤5.1: 未找到根账户认证信息', {
        seedAddress
      });
    }
    
    res.json({
      ring: ringToUse,
      keyImage: signature.keyImage,
      signature: responseSignature,
      valid: true
    });
  } catch (error) {
    console.error('生成影子账户环签名失败:', error);
    res.status(500).json({ error: '生成环签名失败: ' + error.message });
  }
});

// 验证影子账户环签名
router.post('/verify-shadow-signature', async (req, res) => {
  try {
    const { seedAddress, shadowAddress, ring, signature, keyImage } = req.body;
    
    console.log('验证请求参数:', {
      hasSeedAddress: !!seedAddress,
      hasShadowAddress: !!shadowAddress,
      hasRing: !!ring,
      hasSignature: !!signature,
      hasKeyImage: !!keyImage,
      ringLength: ring ? ring.length : 0,
      signatureKeys: signature ? Object.keys(signature) : []
    });
    
    // 添加调试信息 - 检查认证存储
    console.log('认证存储状态:', authenticationStore.debug());
    
    if (!shadowAddress || !ring || !signature) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        received: { 
          hasSeedAddress: !!seedAddress,
          hasShadowAddress: !!shadowAddress,
          hasRing: !!ring,
          hasSignature: !!signature,
          hasKeyImage: !!keyImage
        } 
      });
    }
    
    // 解析签名
    const parsedSignature = typeof signature === 'string' 
      ? JSON.parse(signature) 
      : signature;
    
    console.log('解析后的签名对象:', {
      keys: Object.keys(parsedSignature),
      hasC: !!parsedSignature.c,
      hasR: !!parsedSignature.r,
      hasKeyImage: !!parsedSignature.keyImage,
      cIsArray: Array.isArray(parsedSignature.c),
      rIsArray: Array.isArray(parsedSignature.r),
      cLength: parsedSignature.c ? parsedSignature.c.length : 0,
      rLength: parsedSignature.r ? parsedSignature.r.length : 0
    });
    
    // 确保签名对象包含必要的字段
    if (!parsedSignature.c || !parsedSignature.r || 
        !Array.isArray(parsedSignature.c) || !Array.isArray(parsedSignature.r)) {
      
      return res.status(400).json({ error: '签名对象格式不正确' });
    }
    
    // 获取密钥映像
    let keyImageToUse = keyImage || parsedSignature.keyImage;
    if (!keyImageToUse) {
      return res.status(400).json({ error: '缺少密钥映像' });
    }
    
    console.log('使用的密钥映像:', keyImageToUse);
    
    // 验证环签名
    const signatureWithKeyImage = {
      ...parsedSignature,
      keyImage: keyImageToUse
    };
    
    console.log('完整的签名对象:', {
      keyImage: signatureWithKeyImage.keyImage,
      cLength: signatureWithKeyImage.c.length,
      rLength: signatureWithKeyImage.r.length
    });
    
    const isValid = verifyRingSignature(shadowAddress, ring, signatureWithKeyImage);
    
    console.log('环签名验证结果:', isValid);
    
    // 存储影子账户关联信息
    if (isValid && seedAddress) {
      // 获取根账户的认证信息
      const authInfo = authenticationStore.get(seedAddress);
      
      if (authInfo) {
        // 添加影子账户关联信息
        authInfo.shadowAddress = shadowAddress;
        authInfo.shadowKeyImage = keyImageToUse;
        authInfo.shadowTimestamp = Date.now();
        authenticationStore.set(seedAddress, authInfo);
        
        console.log('更新认证存储:', {
          seedAddress,
          shadowAddress,
          hasAuthInfo: true
        });
      } else {
        console.log('未找到根账户认证信息:', {
          seedAddress
        });
        
        // 尝试创建新的认证信息
        const newAuthInfo = {
          soulAddress: null, // 无法确定灵魂地址
          shadowAddress: shadowAddress,
          shadowKeyImage: keyImageToUse,
          shadowTimestamp: Date.now(),
          authToken: crypto.randomBytes(16).toString('hex'),
          timestamp: Date.now(),
          beijingTime: new Date(Date.now() + 8 * 60 * 60 * 1000)
            .toISOString()
            .replace('T', ' ')
            .substr(0, 19)
        };
        
        authenticationStore.set(seedAddress, newAuthInfo);
        console.log('创建了新的认证信息:', {
          seedAddress,
          shadowAddress,
          authToken: newAuthInfo.authToken.substring(0, 8) + '...'
        });
      }
    }
    
    res.json({
      valid: isValid,
      message: isValid ? '环签名验证成功' : '环签名验证失败'
    });
  } catch (error) {
    console.error('验证影子账户环签名失败:', error);
    res.status(500).json({ error: '验证环签名失败: ' + error.message });
  }
});

// 生成影子账户证明
router.post('/generate-shadow-proof', async (req, res) => {
  try {
    const { seedAddress, shadowAddress, ring, signature, keyImage } = req.body;
    
    if (!seedAddress || !shadowAddress || !ring || !signature || !keyImage) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    console.log('后端步骤1: 接收到生成影子账户证明请求', {
      seedAddress,
      shadowAddress,
      ringLength: ring.length,
      keyImage
    });
    
    // 解析签名
    const parsedSignature = typeof signature === 'string' 
      ? JSON.parse(signature) 
      : signature;
    
    // 生成证明
    const proof = generateRingSignatureProof(shadowAddress, ring, {
      ...parsedSignature,
      keyImage
    });
    
    console.log('后端步骤2: 证明生成成功');
    
    res.json({
      valid: true,
      proof
    });
  } catch (error) {
    console.error('生成影子账户证明失败:', error);
    res.status(500).json({ error: '生成证明失败: ' + error.message });
  }
});

// 健康检查 API
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 添加一个简单的测试端点
router.get('/test', (req, res) => {
    res.json({ status: 'ok', message: '服务器正常运行' });
});

// 添加调试端点
router.get('/debug-auth-store', (req, res) => {
  try {
    const debugInfo = authenticationStore.debug();
    res.json({
      status: 'ok',
      authStore: debugInfo
    });
  } catch (error) {
    console.error('获取认证存储调试信息失败:', error);
    res.status(500).json({ error: '获取调试信息失败: ' + error.message });
  }
});

module.exports = router;
