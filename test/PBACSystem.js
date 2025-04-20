const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PBAC策略访问控制系统", function () {
  let policyRegistry;
  let semanticAnalyzer;
  let accessControl;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    // 获取签名者
    [owner, user1, user2] = await ethers.getSigners();

    // 部署PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    const policyRegistryDeployment = await PolicyRegistry.deploy();
    policyRegistry = await policyRegistryDeployment.waitForDeployment();

    // 部署FlexibleSemanticAnalyzer，传入PolicyRegistry地址
    const FlexibleSemanticAnalyzer = await ethers.getContractFactory("FlexibleSemanticAnalyzer");
    const semanticAnalyzerDeployment = await FlexibleSemanticAnalyzer.deploy(await policyRegistry.getAddress());
    semanticAnalyzer = await semanticAnalyzerDeployment.waitForDeployment();

    // 部署AccessControl
    const AccessControl = await ethers.getContractFactory("AccessControl");
    const accessControlDeployment = await AccessControl.deploy(
      await policyRegistry.getAddress(),
      await semanticAnalyzer.getAddress()
    );
    accessControl = await accessControlDeployment.waitForDeployment();
  });

  describe("基本功能测试", function () {
    it("应该成功创建一个新策略", async function () {
      // 创建策略
      await policyRegistry.createPolicy(
        "ETH余额策略",
        "secret-document",
        "read"
      );
      
      // 添加策略条件 - ETH余额检查
      await policyRegistry.addCondition(
        0, // 策略ID
        "", // 合约地址（ETH无需合约地址）
        "", // 合约标准类型（ETH无需标准类型）
        "ethereum", // 链
        "eth_getBalance", // 方法
        [":userAddress", "latest"], // 参数
        ">=", // 比较运算符
        "1000000000000" // 比较值 - 0.000001 ETH
      );
      
      // 验证策略创建成功
      const policyCount = await policyRegistry.getPolicyCount();
      expect(policyCount).to.equal(1);
      
      const policy = await policyRegistry.getPolicyInfo(0);
      expect(policy.policyName).to.equal("ETH余额策略");
      expect(policy.isActive).to.equal(true);
      
      // 验证条件创建成功
      const conditionIds = await policyRegistry.getPolicyConditionIds(0);
      expect(conditionIds.length).to.equal(1);
      
      const condition = await policyRegistry.getCondition(conditionIds[0]);
      expect(condition.method).to.equal("eth_getBalance");
      expect(condition.returnValueTest.comparator).to.equal(">=");
      expect(condition.returnValueTest.value).to.equal("1000000000000");
    });
    
    it("应该成功更新策略", async function () {
      // 创建策略
      await policyRegistry.createPolicy(
        "ETH余额策略",
        "secret-document",
        "read"
      );
      
      // 添加策略条件
      await policyRegistry.addCondition(
        0, // 策略ID
        "", // 合约地址
        "", // 合约标准类型
        "ethereum", // 链
        "eth_getBalance", // 方法
        [":userAddress", "latest"], // 参数
        ">=", // 比较运算符
        "1000000000000" // 比较值 - 0.000001 ETH
      );
      
      // 更新策略操作
      await policyRegistry.updatePolicy(0, "write");
      
      // 验证策略更新成功
      const policy = await policyRegistry.getPolicyInfo(0);
      expect(policy.action).to.equal("write");
      
      // 删除旧条件
      const conditionIds = await policyRegistry.getPolicyConditionIds(0);
      await policyRegistry.removeCondition(0, conditionIds[0]);
      
      // 添加新条件
      await policyRegistry.addCondition(
        0, // 策略ID
        "", // 合约地址
        "", // 合约标准类型
        "ethereum", // 链
        "eth_getBalance", // 方法
        [":userAddress", "latest"], // 参数
        ">=", // 比较运算符
        "2000000000000" // 比较值 - 0.000002 ETH
      );
      
      // 验证新条件创建成功
      const newConditionIds = await policyRegistry.getPolicyConditionIds(0);
      expect(newConditionIds.length).to.equal(1);
      
      const newCondition = await policyRegistry.getCondition(newConditionIds[0]);
      expect(newCondition.returnValueTest.value).to.equal("2000000000000");
    });
    
    it("应该成功停用策略", async function () {
      // 创建策略
      await policyRegistry.createPolicy(
        "ETH余额策略",
        "secret-document",
        "read"
      );
      
      // 添加策略条件
      await policyRegistry.addCondition(
        0, // 策略ID
        "", // 合约地址
        "", // 合约标准类型
        "ethereum", // 链
        "eth_getBalance", // 方法
        [":userAddress", "latest"], // 参数
        ">=", // 比较运算符
        "1000000000000" // 比较值 - 0.000001 ETH
      );
      
      // 停用策略
      await policyRegistry.deactivatePolicy(0);
      
      // 验证策略停用成功
      const policy = await policyRegistry.getPolicyInfo(0);
      expect(policy.isActive).to.equal(false);
    });
  });

  describe("访问控制测试", function () {
    it("应该检查资源访问权限", async function () {
      // 创建策略
      await policyRegistry.createPolicy(
        "测试策略",
        "resource1",
        "read"
      );
      
      // 添加策略条件
      await policyRegistry.addCondition(
        0, // 策略ID
        "", // 合约地址
        "", // 合约标准类型
        "ethereum", // 链
        "eth_getBalance", // 方法
        [":userAddress", "latest"], // 参数
        ">=", // 比较运算符
        "0" // 比较值
      );
      
      // 直接调用合约，获取交易回执
      const tx = await accessControl.checkAccess(
        user1.address,
        "resource1",
        "read"
      );
      const receipt = await tx.wait();
      
      // 检查事件
      const event = receipt.logs
        .filter(log => log.fragment && log.fragment.name === "AccessChecked")
        .map(log => accessControl.interface.parseLog(log))[0];
      
      expect(event.args.granted).to.equal(true);
    });
    
    it("应该拒绝不匹配资源和操作的访问", async function () {
      // 直接调用合约，获取交易回执
      const tx = await accessControl.checkAccess(
        user1.address,
        "resource2",
        "write"
      );
      const receipt = await tx.wait();
      
      // 检查事件
      const event = receipt.logs
        .filter(log => log.fragment && log.fragment.name === "AccessChecked")
        .map(log => accessControl.interface.parseLog(log))[0];
      
      expect(event.args.granted).to.equal(false);
    });
    
    it("应该检查特定策略对特定用户的评估结果", async function () {
      const result = await semanticAnalyzer.evaluatePolicyConditions(
        0,
        user1.address
      );
      expect(result).to.equal(true);
    });
  });
}); 