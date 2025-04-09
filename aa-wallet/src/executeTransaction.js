import { ethers } from 'ethers';
import { UserOperationBuilder } from '@account-abstraction/sdk';

// 执行 AA 钱包交易
export async function executeTransaction(
  provider,
  aaWallet,
  target,
  value,
  data,
  paymasterAndData = '0x'
) {
  // 创建用户操作
  const op = new UserOperationBuilder()
    .setSender(aaWallet.address)
    .setNonce(await getNonce(provider, aaWallet.address))
    .setCallData(encodeCallData(target, value, data))
    .setPaymasterAndData(paymasterAndData)
    .build();
  
  // 签名用户操作
  const signature = await signUserOp(op, aaWallet.owner);
  op.signature = signature;
  
  // 发送用户操作到入口点
  const entryPoint = getEntryPoint(provider);
  const result = await entryPoint.handleOps([op], aaWallet.owner.address);
  
  return result;
} 