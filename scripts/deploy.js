// 部署PBAC策略访问控制系统的脚本
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署PBAC策略访问控制系统...");

  // 部署PolicyRegistry合约
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistryDeployment = await PolicyRegistry.deploy();
  const policyRegistry = await policyRegistryDeployment.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log(`PolicyRegistry 部署成功，地址: ${policyRegistryAddress}`);

  // 部署FlexibleSemanticAnalyzer合约，传入PolicyRegistry地址
  const FlexibleSemanticAnalyzer = await ethers.getContractFactory("FlexibleSemanticAnalyzer");
  const semanticAnalyzerDeployment = await FlexibleSemanticAnalyzer.deploy(policyRegistryAddress);
  const semanticAnalyzer = await semanticAnalyzerDeployment.waitForDeployment();
  const semanticAnalyzerAddress = await semanticAnalyzer.getAddress();
  console.log(`FlexibleSemanticAnalyzer 部署成功，地址: ${semanticAnalyzerAddress}`);

  // 部署AccessControl合约
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControlDeployment = await AccessControl.deploy(policyRegistryAddress, semanticAnalyzerAddress);
  const accessControl = await accessControlDeployment.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log(`AccessControl 部署成功，地址: ${accessControlAddress}`);

  console.log("PBAC策略访问控制系统部署完成！");
  console.log("\n部署信息汇总:");
  console.log(`- PolicyRegistry: ${policyRegistryAddress}`);
  console.log(`- FlexibleSemanticAnalyzer: ${semanticAnalyzerAddress}`);
  console.log(`- AccessControl: ${accessControlAddress}`);
}

// 执行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
