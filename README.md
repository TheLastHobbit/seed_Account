# 基于环签名的根账户系统

本项目实现了一个基于环签名的根账户系统，用于去中心化身份管理。根账户可以通过环签名进行匿名认证，同时保证其合法性和唯一性。

## 项目结构

- `contracts/`: 智能合约代码
  - `SeedCertifier.sol`: 根账户认证合约
- `backend/`: Express后端服务
  - `routes/signature.js`: 环签名生成API
- `frontend/`: React前端应用
  - `src/components/`: React组件
  - `src/utils/`: 工具函数

## 技术栈

- 智能合约: Solidity 0.8.13
- 后端: Node.js, Express
- 前端: React, ethers.js
- 密码学: 椭圆曲线加密, 环签名

## 功能特性

- 生成根账户密钥对
- 使用环签名进行匿名认证
- 防止重复认证（通过关键映像）
- 链上验证根账户状态

## 安装与运行

### 智能合约

1. 安装 Foundry:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. 编译合约:
   ```bash
   cd contracts
   forge build
   ```

3. 部署合约:
   ```bash
   forge create --rpc-url <YOUR_RPC_URL> --private-key <YOUR_PRIVATE_KEY> SeedCertifier.sol:SeedCertifier
   ```

### 后端服务

1. 安装依赖:
   ```bash
   cd backend
   npm install
   ```

2. 启动服务:
   ```bash
   npm start
   ```

### 前端应用

1. 安装依赖:
   ```bash
   cd frontend
   npm install
   ```

2. 更新合约地址:
   在 `src/components/SeedAccount.js` 中更新 `CERTIFIER_ADDRESS` 为实际部署的合约地址。

3. 启动应用:
   ```bash
   npm start
   ```

## 使用流程

1. 打开前端应用，连接 MetaMask 钱包
2. 点击"生成新根账户"按钮
3. 点击"认证账户"按钮进行环签名认证
4. 确认交易，等待认证完成

## 安全注意事项

- 私钥仅在客户端存储，不会发送到服务器
- 环签名确保认证过程的匿名性
- 关键映像防止重复认证

## 扩展功能

本系统可以扩展支持:
- 绑定灵魂账户
- 多重签名认证
- 隐私保护的身份验证
