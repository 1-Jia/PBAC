// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PolicyRegistry.sol";
import "./FlexibleSemanticAnalyzer.sol";

/**
 * @title AccessControl
 * @dev 访问控制主合约，负责协调策略注册表和语义分析器
 */
contract AccessControl {
    PolicyRegistry private policyRegistry;
    FlexibleSemanticAnalyzer private semanticAnalyzer;
    
    // 事件定义
    event AccessChecked(address user, string resource, string action, bool granted);
    event PolicyEnforced(uint256 policyId, address user, bool result);
    
    /**
     * @dev 构造函数
     * @param _policyRegistry 策略注册表合约地址
     * @param _semanticAnalyzer 语义分析器合约地址
     */
    constructor(address _policyRegistry, address _semanticAnalyzer) {
        policyRegistry = PolicyRegistry(_policyRegistry);
        semanticAnalyzer = FlexibleSemanticAnalyzer(_semanticAnalyzer);
    }
    
    /**
     * @dev 检查访问权限
     * @param user 用户地址
     * @param resource 资源标识
     * @param action 操作类型
     * @return 是否允许访问
     */
    function checkAccess(
        address user,
        string memory resource,
        string memory action
    ) public returns (bool) {
        uint256 policyCount = policyRegistry.getPolicyCount();
        bool accessGranted = false;
        
        for (uint256 i = 0; i < policyCount; i++) {
            PolicyRegistry.Policy memory policy = policyRegistry.getPolicyInfo(i);
            
            if (!policy.isActive) continue;
            
            // 检查资源和操作是否匹配
            if (compareStrings(policy.resource, resource) &&
                compareStrings(policy.action, action)) {
                
                // 评估策略条件
                bool satisfied = semanticAnalyzer.evaluatePolicyConditions(i, user);
                
                if (satisfied) {
                    emit PolicyEnforced(policy.policyId, user, true);
                    accessGranted = true;
                    // 不立即返回，继续检查其他策略，以记录所有匹配的策略
                }
            }
        }
        
        emit AccessChecked(user, resource, action, accessGranted);
        return accessGranted;
    }
    
    /**
     * @dev 检查特定策略是否允许用户访问
     * @param policyId 策略ID
     * @param user 用户地址
     * @return 是否满足策略条件
     */
    function checkPolicyForUser(uint256 policyId, address user) public returns (bool) {
        PolicyRegistry.Policy memory policy = policyRegistry.getPolicyInfo(policyId);
        
        if (!policy.isActive) {
            emit PolicyEnforced(policyId, user, false);
            return false;
        }
        
        bool result = semanticAnalyzer.evaluatePolicyConditions(policyId, user);
        emit PolicyEnforced(policyId, user, result);
        return result;
    }
    
    /**
     * @dev 获取策略注册表合约地址
     */
    function getPolicyRegistryAddress() public view returns (address) {
        return address(policyRegistry);
    }
    
    /**
     * @dev 获取语义分析器合约地址
     */
    function getSemanticAnalyzerAddress() public view returns (address) {
        return address(semanticAnalyzer);
    }
    
    // 辅助函数：字符串比较
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
