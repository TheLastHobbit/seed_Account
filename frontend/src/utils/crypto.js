import { ethers } from 'ethers';

/**
 * 生成根账户
 * @returns {Promise<{address: string, privateKey: string, publicKey: string}>}
 */
export async function generateSeedAccount() {
  // 创建随机钱包
  const wallet = ethers.Wallet.createRandom();
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey
  };
}

/**
 * 从私钥恢复账户
 * @param {string} privateKey - 私钥
 * @returns {Promise<{address: string, privateKey: string, publicKey: string}>}
 */
export async function recoverSeedAccount(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey
    };
  } catch (error) {
    throw new Error('无效的私钥');
  }
}
