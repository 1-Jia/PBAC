// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PolicyRegistry
 * @dev 策略注册表合约，负责PBAC策略的创建、更新和管理
 */
contract PolicyRegistry {
    // 返回值测试结构体，对应JSON中的returnValueTest
    struct ReturnValueTest {
        string comparator;  // 比较运算符
        string value;       // 比较值
    }
    
    // 访问控制条件结构体，对应JSON中的条件元素
    struct AccessCondition {
        uint256 id;
        uint256 policyId;
        string contractAddress;       // 合约地址
        string standardContractType;  // 合约标准类型(ERC20, ERC721等)
        string chain;                 // 链名称
        string method;                // 方法名
        ReturnValueTest returnValueTest; // 返回值测试
    }
    
    // 条件参数结构体
    struct ConditionParameter {
        uint256 conditionId;
        string value;
    }
    
    // 策略结构体定义
    struct Policy {
        uint256 policyId;           // 策略唯一标识
        address owner;              // 策略所有者地址
        string policyName;          // 策略名称
        string resource;            // 受保护的资源标识
        string action;              // 允许的操作类型
        bool isActive;              // 策略是否激活
    }
    
    // 存储所有策略的映射
    mapping(uint256 => Policy) private policies;
    
    // 策略计数器
    uint256 private policyCount;
    
    // 条件计数器
    uint256 private conditionCount;
    
    // 存储策略关联的条件ID
    mapping(uint256 => uint256[]) private policyConditionIds;
    
    // 存储所有条件
    mapping(uint256 => AccessCondition) private conditions;
    
    // 存储条件参数
    mapping(uint256 => string[]) private conditionParameters;
    
    // 事件定义
    event PolicyCreated(uint256 policyId, address owner);
    event PolicyUpdated(uint256 policyId);
    event PolicyDeactivated(uint256 policyId);
    event PolicyStatusChanged(uint256 policyId, bool isActive);
    
    /**
     * @dev 创建新策略
     * @param _policyName 策略名称
     * @param _resource 资源标识
     * @param _action 操作类型
     * @return 新创建的策略ID
     */
    function createPolicy(
        string memory _policyName,
        string memory _resource,
        string memory _action
    ) public returns (uint256) {
        uint256 newPolicyId = policyCount++;
        
        policies[newPolicyId] = Policy({
            policyId: newPolicyId,
            owner: msg.sender,
            policyName: _policyName,
            resource: _resource,
            action: _action,
            isActive: true
        });
        
        emit PolicyCreated(newPolicyId, msg.sender);
        return newPolicyId;
    }
    
    /**
     * @dev 添加策略条件
     * @param _policyId 策略ID
     * @param _contractAddress 合约地址
     * @param _standardContractType 合约标准类型
     * @param _chain 链名称
     * @param _method 方法名
     * @param _parameters 参数数组
     * @param _comparator 比较运算符
     * @param _value 比较值
     * @return 新条件的ID
     */
    function addCondition(
        uint256 _policyId,
        string memory _contractAddress,
        string memory _standardContractType,
        string memory _chain,
        string memory _method,
        string[] memory _parameters,
        string memory _comparator,
        string memory _value
    ) public returns (uint256) {
        require(policies[_policyId].owner == msg.sender, "Not policy owner");
        require(policies[_policyId].isActive, "Policy is inactive");
        
        uint256 newConditionId = conditionCount++;
        
        conditions[newConditionId] = AccessCondition({
            id: newConditionId,
            policyId: _policyId,
            contractAddress: _contractAddress,
            standardContractType: _standardContractType,
            chain: _chain,
            method: _method,
            returnValueTest: ReturnValueTest({
                comparator: _comparator,
                value: _value
            })
        });
        
        // 添加参数
        for (uint i = 0; i < _parameters.length; i++) {
            conditionParameters[newConditionId].push(_parameters[i]);
        }
        
        // 将条件ID关联到策略
        policyConditionIds[_policyId].push(newConditionId);
        
        return newConditionId;
    }
    
    /**
     * @dev 更新策略的基本信息
     * @param _policyId 要更新的策略ID
     * @param _action 新操作类型
     */
    function updatePolicy(
        uint256 _policyId,
        string memory _action
    ) public {
        require(policies[_policyId].owner == msg.sender, "Not policy owner");
        require(policies[_policyId].isActive, "Policy is inactive");
        
        policies[_policyId].action = _action;
        
        emit PolicyUpdated(_policyId);
    }
    
    /**
     * @dev 删除策略条件
     * @param _policyId 策略ID
     * @param _conditionId 条件ID
     */
    function removeCondition(uint256 _policyId, uint256 _conditionId) public {
        require(policies[_policyId].owner == msg.sender, "Not policy owner");
        require(conditions[_conditionId].policyId == _policyId, "Condition not associated with policy");
        
        // 找到条件在关联数组中的索引
        uint256[] storage conditionIds = policyConditionIds[_policyId];
        for (uint i = 0; i < conditionIds.length; i++) {
            if (conditionIds[i] == _conditionId) {
                // 将最后一个元素移到要删除的位置，然后删除最后一个元素
                if (i < conditionIds.length - 1) {
                    conditionIds[i] = conditionIds[conditionIds.length - 1];
                }
                conditionIds.pop();
                break;
            }
        }
        
        // 清除参数
        delete conditionParameters[_conditionId];
        // 清除条件
        delete conditions[_conditionId];
    }
    
    /**
     * @dev 停用策略
     * @param _policyId 要停用的策略ID
     */
    function deactivatePolicy(uint256 _policyId) public {
        require(policies[_policyId].owner == msg.sender, "Not policy owner");
        policies[_policyId].isActive = false;
        emit PolicyDeactivated(_policyId);
    }
    
    /**
     * @dev 获取策略基本信息
     * @param _policyId 策略ID
     * @return 策略结构体
     */
    function getPolicyInfo(uint256 _policyId) public view returns (Policy memory) {
        return policies[_policyId];
    }
    
    /**
     * @dev 获取策略的条件ID列表
     * @param _policyId 策略ID
     * @return 条件ID数组
     */
    function getPolicyConditionIds(uint256 _policyId) public view returns (uint256[] memory) {
        return policyConditionIds[_policyId];
    }
    
    /**
     * @dev 获取条件信息
     * @param _conditionId 条件ID
     * @return 条件结构体
     */
    function getCondition(uint256 _conditionId) public view returns (AccessCondition memory) {
        return conditions[_conditionId];
    }
    
    /**
     * @dev 获取条件参数
     * @param _conditionId 条件ID
     * @return 参数数组
     */
    function getConditionParameters(uint256 _conditionId) public view returns (string[] memory) {
        return conditionParameters[_conditionId];
    }
    
    /**
     * @dev 获取策略总数
     * @return 策略总数
     */
    function getPolicyCount() public view returns (uint256) {
        return policyCount;
    }
    
    /**
     * @dev 设置策略状态（激活或停用）
     * @param _policyId 策略ID
     * @param _isActive 新的策略状态
     */
    function setPolicyStatus(uint256 _policyId, bool _isActive) public {
        require(_policyId < policyCount, "Policy does not exist");
        require(policies[_policyId].owner == msg.sender, "Not policy owner");
        policies[_policyId].isActive = _isActive;
        emit PolicyStatusChanged(_policyId, _isActive);
    }
}