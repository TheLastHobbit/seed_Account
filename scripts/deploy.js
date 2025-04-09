// 使用ethers.js的简单部署脚本
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// 加载环境变量
require("dotenv").config();

// 加载合约ABI和字节码
const SeedCertifierArtifact = require("../build/SeedCertifier.json");
const ShadowVerifierArtifact = require("../build/ShadowVerifier.json");

async function main() {
  // 配置提供商和钱包
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`部署账户: ${wallet.address}`);
  console.log(`账户余额: ${ethers.utils.formatEther(await wallet.getBalance())} ETH`);

  // 部署SeedCertifier
  console.log("部署SeedCertifier合约...");
  const SeedCertifierFactory = new ethers.ContractFactory(
    SeedCertifierArtifact.abi,
    SeedCertifierArtifact.bytecode,
    wallet
  );
  const seedCertifier = await SeedCertifierFactory.deploy();
  await seedCertifier.deployed();
  console.log(`SeedCertifier已部署到: ${seedCertifier.address}`);

  // 部署ShadowVerifier
  console.log("部署ShadowVerifier合约...");
  const ShadowVerifierFactory = new ethers.ContractFactory(
    ShadowVerifierArtifact.abi,
    ShadowVerifierArtifact.bytecode,
    wallet
  );
  const shadowVerifier = await ShadowVerifierFactory.deploy();
  await shadowVerifier.deployed();
  console.log(`ShadowVerifier已部署到: ${shadowVerifier.address}`);

  // 保存部署信息
  const deploymentInfo = {
    network: process.env.NETWORK_NAME || "unknown",
    chainId: (await provider.getNetwork()).chainId,
    SeedCertifier: seedCertifier.address,
    ShadowVerifier: shadowVerifier.address,
    deploymentTime: new Date().toISOString()
  };

  // 保存到json文件
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${deploymentInfo.network}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`部署信息已保存到deployments/${deploymentInfo.network}.json`);
  
  // 更新前端配置
  try {
    const frontendDir = path.join(__dirname, "../../frontend/src/config");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    const configPath = path.join(frontendDir, "contract-addresses.json");
    let contractConfig = {};
    
    if (fs.existsSync(configPath)) {
      contractConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    contractConfig[deploymentInfo.network] = {
      SeedCertifier: seedCertifier.address,
      ShadowVerifier: shadowVerifier.address,
      deploymentTime: deploymentInfo.deploymentTime
    };
    
    fs.writeFileSync(configPath, JSON.stringify(contractConfig, null, 2));
    console.log(`前端配置已更新: ${configPath}`);
  } catch (error) {
    console.warn("更新前端配置失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  }); 