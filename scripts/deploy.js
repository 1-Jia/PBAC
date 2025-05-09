// 部署PBAC策略访问控制系统的脚本
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("开始部署合约...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户地址部署:", deployer.address);

  // 部署PolicyRegistry合约
  console.log("部署PolicyRegistry合约...");
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log("PolicyRegistry部署地址:", policyRegistryAddress);

  // 部署FlexibleSemanticAnalyzer合约
  console.log("部署FlexibleSemanticAnalyzer合约...");
  const FlexibleSemanticAnalyzer = await ethers.getContractFactory("FlexibleSemanticAnalyzer");
  const semanticAnalyzer = await FlexibleSemanticAnalyzer.deploy(policyRegistryAddress);
  await semanticAnalyzer.waitForDeployment();
  const semanticAnalyzerAddress = await semanticAnalyzer.getAddress();
  console.log("FlexibleSemanticAnalyzer部署地址:", semanticAnalyzerAddress);

  // 部署AccessControl合约
  console.log("部署AccessControl合约...");
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy(policyRegistryAddress, semanticAnalyzerAddress);
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log("AccessControl部署地址:", accessControlAddress);

  // 更新前端配置
  console.log("更新前端配置...");
  const contractAddresses = {
    policyRegistry: policyRegistryAddress,
    semanticAnalyzer: semanticAnalyzerAddress,
    accessControl: accessControlAddress
  };

  // 更新Web3Context.js中的合约地址
  const web3ContextPath = path.join(__dirname, '../frontend/src/contexts/Web3Context.js');
  let web3ContextContent = fs.readFileSync(web3ContextPath, 'utf8');
  
  // 替换合约地址
  const newContractAddresses = `const CONTRACT_ADDRESSES = {
  policyRegistry: '${contractAddresses.policyRegistry}',
  semanticAnalyzer: '${contractAddresses.semanticAnalyzer}',
  accessControl: '${contractAddresses.accessControl}'
};`;
  
  web3ContextContent = web3ContextContent.replace(
    /const CONTRACT_ADDRESSES = {[\s\S]*?};/,
    newContractAddresses
  );
  
  fs.writeFileSync(web3ContextPath, web3ContextContent);

  // 更新环境变量文件
  const envPath = path.join(__dirname, '../frontend/.env');
  const envContent = `REACT_APP_CONTRACT_ADDRESSES='${JSON.stringify(contractAddresses)}'`;
  fs.writeFileSync(envPath, envContent);

  console.log("部署完成！");
  console.log("合约地址已更新到前端配置中");
}

// 执行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
