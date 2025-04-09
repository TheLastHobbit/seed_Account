import { ethers } from 'ethers';
import { EntryPoint__factory, SimpleAccountFactory__factory } from '@account-abstraction/contracts';

// 创建 AA 钱包
export async function createAAWallet(provider, factoryAddress) {
  // 创建随机 EOA 作为钱包所有者
  const owner = ethers.Wallet.createRandom();
  
  // 连接到工厂合约
  const factory = SimpleAccountFactory__factory.connect(
    factoryAddress,
    provider
  );
  
  // 计算 AA 钱包地址
  const walletAddress = await factory.getAddress(owner.address, 0);
  
  return {
    owner,
    address: walletAddress,
    implementation: await factory.accountImplementation(),
    factoryAddress
  };
} 