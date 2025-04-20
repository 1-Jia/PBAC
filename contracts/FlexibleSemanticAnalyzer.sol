// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PolicyRegistry.sol";

/**
 * @title FlexibleSemanticAnalyzer
 * @dev 支持多合约标准和动态比较运算符的语义分析合约
 */
contract FlexibleSemanticAnalyzer {
    // 接口ID定义
    bytes4 private constant ERC20_INTERFACE_ID = 0x36372b07;
    bytes4 private constant ERC721_INTERFACE_ID = 0x80ac58cd;
    bytes4 private constant ERC1155_INTERFACE_ID = 0xd9b67a26;
    
    // 支持的比较运算符
    string[] private supportedComparators = ["==", "!=", ">", "<", ">=", "<="];
    
    // 策略注册表引用
    PolicyRegistry private policyRegistry;
    
    /**
     * @dev 构造函数
     * @param _policyRegistry 策略注册表合约地址
     */
    constructor(address _policyRegistry) {
        policyRegistry = PolicyRegistry(_policyRegistry);
    }
    
    /**
     * @dev 评估一个策略的所有条件是否满足
     * @param policyId 策略ID
     * @param userAddress 用户地址
     * @return 是否满足条件
     */
    function evaluatePolicyConditions(
        uint256 policyId,
        address userAddress
    ) public view returns (bool) {
        // 获取策略的所有条件ID
        uint256[] memory conditionIds = policyRegistry.getPolicyConditionIds(policyId);
        
        // 如果没有条件，默认允许访问
        if (conditionIds.length == 0) {
            return true;
        }
        
        // 所有条件都必须满足（AND逻辑）
        for (uint i = 0; i < conditionIds.length; i++) {
            if (!evaluateCondition(conditionIds[i], userAddress)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev 评估单个条件是否满足
     * @param conditionId 条件ID
     * @param userAddress 用户地址
     * @return 是否满足条件
     */
    function evaluateCondition(
        uint256 conditionId,
        address userAddress
    ) public view returns (bool) {
        // 获取条件和参数
        PolicyRegistry.AccessCondition memory condition = policyRegistry.getCondition(conditionId);
        string[] memory parameters = policyRegistry.getConditionParameters(conditionId);
        
        // 验证比较运算符是否支持
        require(
            isComparatorSupported(condition.returnValueTest.comparator),
            "Unsupported comparator"
        );
        
        // 处理标准合约验证
        if (bytes(condition.standardContractType).length > 0) {
            if (bytes(condition.contractAddress).length > 0) {
                bool standardValid = verifyContractStandard(
                    condition.contractAddress, 
                    condition.standardContractType
                );
                
                if (!standardValid) {
                    return false;
                }
            }
        }
        
        // 处理方法调用
        return processMethodCall(condition, parameters, userAddress);
    }
    
    /**
     * @dev 处理方法调用并验证结果
     */
    function processMethodCall(
        PolicyRegistry.AccessCondition memory condition,
        string[] memory parameters,
        address userAddress
    ) internal view returns (bool) {
        // 处理以太坊原生方法
        if (compareStrings(condition.method, "eth_getBalance")) {
            return checkEthBalance(userAddress, condition.returnValueTest);
        }
        
        // 处理合约方法调用
        if (bytes(condition.contractAddress).length > 0) {
            address contractAddr = parseAddress(condition.contractAddress);
            
            // 替换参数中的占位符
            string[] memory processedParams = processParameters(parameters, userAddress);
            
            // ERC20 balanceOf
            if (compareStrings(condition.method, "balanceOf") && 
                compareStrings(condition.standardContractType, "ERC20")) {
                return checkERC20Balance(contractAddr, processedParams, condition.returnValueTest);
            }
            
            // ERC721 ownerOf
            if (compareStrings(condition.method, "ownerOf") &&
                compareStrings(condition.standardContractType, "ERC721")) {
                return checkERC721Ownership(contractAddr, processedParams, condition.returnValueTest, userAddress);
            }
            
            // ERC1155 balanceOf
            if (compareStrings(condition.method, "balanceOf") &&
                compareStrings(condition.standardContractType, "ERC1155")) {
                return checkERC1155Balance(contractAddr, processedParams, condition.returnValueTest);
            }
        }
        
        revert("Unsupported method or missing contract address");
    }
    
    /**
     * @dev 处理参数中的占位符
     */
    function processParameters(
        string[] memory params, 
        address userAddr
    ) internal pure returns (string[] memory) {
        string[] memory processed = new string[](params.length);
        
        for (uint i = 0; i < params.length; i++) {
            if (compareStrings(params[i], ":userAddress")) {
                processed[i] = addressToString(userAddr);
            } else {
                processed[i] = params[i];
            }
        }
        
        return processed;
    }
    
    /**
     * @dev 检查以太坊余额
     */
    function checkEthBalance(
        address userAddr,
        PolicyRegistry.ReturnValueTest memory test
    ) internal view returns (bool) {
        uint256 balance = userAddr.balance;
        uint256 testValue = stringToUint(test.value);
        
        return compareValues(balance, testValue, test.comparator);
    }
    
    /**
     * @dev 检查ERC20代币余额
     */
    function checkERC20Balance(
        address contractAddr,
        string[] memory params,
        PolicyRegistry.ReturnValueTest memory test
    ) internal view returns (bool) {
        require(params.length >= 1, "Missing address parameter");
        
        address account = parseAddress(params[0]);
        bytes memory callData = abi.encodeWithSignature("balanceOf(address)", account);
        
        (bool success, bytes memory result) = contractAddr.staticcall(callData);
        require(success, "ERC20 balanceOf call failed");
        
        uint256 balance = abi.decode(result, (uint256));
        uint256 testValue = stringToUint(test.value);
        
        return compareValues(balance, testValue, test.comparator);
    }
    
    /**
     * @dev 检查ERC721 NFT所有权
     */
    function checkERC721Ownership(
        address contractAddr,
        string[] memory params,
        PolicyRegistry.ReturnValueTest memory test,
        address userAddr
    ) internal view returns (bool) {
        require(params.length >= 1, "Missing tokenId parameter");
        
        uint256 tokenId = stringToUint(params[0]);
        bytes memory callData = abi.encodeWithSignature("ownerOf(uint256)", tokenId);
        
        (bool success, bytes memory result) = contractAddr.staticcall(callData);
        require(success, "ERC721 ownerOf call failed");
        
        address owner = abi.decode(result, (address));
        
        // 特殊处理：检查是否为所有者
        if (compareStrings(test.comparator, "==") && 
            compareStrings(test.value, ":userAddress")) {
            return owner == userAddr;
        }
        
        return compareAddresses(owner, parseAddress(test.value), test.comparator);
    }
    
    /**
     * @dev 检查ERC1155代币余额
     */
    function checkERC1155Balance(
        address contractAddr,
        string[] memory params,
        PolicyRegistry.ReturnValueTest memory test
    ) internal view returns (bool) {
        require(params.length >= 2, "Missing address or tokenId parameters");
        
        address account = parseAddress(params[0]);
        uint256 tokenId = stringToUint(params[1]);
        
        bytes memory callData = abi.encodeWithSignature(
            "balanceOf(address,uint256)", 
            account,
            tokenId
        );
        
        (bool success, bytes memory result) = contractAddr.staticcall(callData);
        require(success, "ERC1155 balanceOf call failed");
        
        uint256 balance = abi.decode(result, (uint256));
        uint256 testValue = stringToUint(test.value);
        
        return compareValues(balance, testValue, test.comparator);
    }
    
    /**
     * @dev 验证合约是否符合指定标准
     */
    function verifyContractStandard(
        string memory contractAddressStr,
        string memory standardType
    ) internal view returns (bool) {
        address contractAddress = parseAddress(contractAddressStr);
        
        if (compareStrings(standardType, "ERC20")) {
            return supportsInterface(contractAddress, ERC20_INTERFACE_ID);
        }
        else if (compareStrings(standardType, "ERC721")) {
            return supportsInterface(contractAddress, ERC721_INTERFACE_ID);
        }
        else if (compareStrings(standardType, "ERC1155")) {
            return supportsInterface(contractAddress, ERC1155_INTERFACE_ID);
        }
        
        revert("Unsupported contract standard");
    }
    
    /**
     * @dev 检查合约是否支持特定接口
     */
    function supportsInterface(
        address contractAddress,
        bytes4 interfaceId
    ) internal view returns (bool) {
        (bool success, bytes memory result) = contractAddress.staticcall(
            abi.encodeWithSignature("supportsInterface(bytes4)", interfaceId)
        );
        return success && result.length > 0 && abi.decode(result, (bool));
    }
    
    // ============== 辅助函数 ==============
    
    /**
     * @dev 检查比较运算符是否支持
     */
    function isComparatorSupported(string memory comparator) internal view returns (bool) {
        for (uint i = 0; i < supportedComparators.length; i++) {
            if (compareStrings(supportedComparators[i], comparator)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev 比较字符串是否相等
     */
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    /**
     * @dev 比较地址
     */
    function compareAddresses(
        address a,
        address b,
        string memory comparator
    ) internal pure returns (bool) {
        if (compareStrings(comparator, "==")) return a == b;
        if (compareStrings(comparator, "!=")) return a != b;
        revert("Invalid comparator for addresses");
    }
    
    /**
     * @dev 比较数值
     */
    function compareValues(
        uint256 a,
        uint256 b,
        string memory comparator
    ) internal pure returns (bool) {
        if (compareStrings(comparator, "==")) return a == b;
        if (compareStrings(comparator, "!=")) return a != b;
        if (compareStrings(comparator, ">")) return a > b;
        if (compareStrings(comparator, "<")) return a < b;
        if (compareStrings(comparator, ">=")) return a >= b;
        if (compareStrings(comparator, "<=")) return a <= b;
        revert("Invalid comparator");
    }
    
    /**
     * @dev 将字符串解析为地址
     */
    function parseAddress(string memory _a) internal pure returns (address) {
        bytes memory tmp = bytes(_a);
        require(tmp.length == 42, "Invalid address length");
        
        uint160 iaddr = 0;
        for (uint i = 2; i < 2 + 2 * 20; i += 2) {
            iaddr *= 256;
            uint160 b1 = uint160(uint8(tmp[i]));
            uint160 b2 = uint160(uint8(tmp[i + 1]));
            
            if ((b1 >= 97) && (b1 <= 102)) b1 -= 87;
            else if ((b1 >= 65) && (b1 <= 70)) b1 -= 55;
            else if ((b1 >= 48) && (b1 <= 57)) b1 -= 48;
            
            if ((b2 >= 97) && (b2 <= 102)) b2 -= 87;
            else if ((b2 >= 65) && (b2 <= 70)) b2 -= 55;
            else if ((b2 >= 48) && (b2 <= 57)) b2 -= 48;
            
            iaddr += (b1 * 16 + b2);
        }
        return address(iaddr);
    }
    
    /**
     * @dev 将地址转换为字符串
     */
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    /**
     * @dev 将字符串解析为uint
     */
    function stringToUint(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint256 c = uint256(uint8(b[i]));
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }
}