/**
 * 截断地址以便于显示
 * @param {string} address 完整的以太坊地址
 * @param {number} startLength 开头显示的字符数
 * @param {number} endLength 结尾显示的字符数
 * @returns {string} 截断后的地址
 */
export const truncateAddress = (address, startLength = 6, endLength = 4) => {
  if (!address) return '';
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

/**
 * 格式化时间戳为可读格式
 * @param {number} timestamp Unix时间戳
 * @returns {string} 格式化的日期时间
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 格式化条件比较运算符以便于显示
 * @param {string} comparator 比较运算符
 * @returns {string} 格式化后的比较运算符
 */
export const formatComparator = (comparator) => {
  const comparatorMap = {
    '==': '等于',
    '!=': '不等于',
    '>': '大于',
    '<': '小于',
    '>=': '大于等于',
    '<=': '小于等于'
  };
  return comparatorMap[comparator] || comparator;
};

/**
 * 格式化策略状态以便于显示
 * @param {boolean} isActive 策略是否激活
 * @returns {Object} 状态显示相关属性
 */
export const formatPolicyStatus = (isActive) => {
  return {
    label: isActive ? '激活' : '停用',
    color: isActive ? 'green' : 'red',
    bgColor: isActive ? 'green.100' : 'red.100',
    textColor: isActive ? 'green.800' : 'red.800'
  };
};

/**
 * 根据资源类型获取对应的图标和颜色
 * @param {string} resource 资源名称
 * @returns {Object} 资源显示相关属性
 */
export const getResourceInfo = (resource) => {
  // 根据资源名称的特征设置不同的样式
  if (resource.includes('file') || resource.includes('文件')) {
    return { icon: 'file', color: 'blue' };
  } else if (resource.includes('api') || resource.includes('接口')) {
    return { icon: 'code', color: 'purple' };
  } else if (resource.includes('database') || resource.includes('数据库')) {
    return { icon: 'database', color: 'green' };
  } else if (resource.includes('user') || resource.includes('用户')) {
    return { icon: 'user', color: 'orange' };
  } else {
    return { icon: 'shield', color: 'gray' };
  }
};

/**
 * 根据操作类型获取对应的图标和颜色
 * @param {string} action 操作名称
 * @returns {Object} 操作显示相关属性
 */
export const getActionInfo = (action) => {
  const actionMap = {
    'read': { icon: 'eye', color: 'blue' },
    'write': { icon: 'edit', color: 'green' },
    'delete': { icon: 'trash', color: 'red' },
    'execute': { icon: 'play', color: 'purple' },
    'admin': { icon: 'star', color: 'orange' }
  };
  
  // 查找匹配的操作
  const key = Object.keys(actionMap).find(k => action.includes(k));
  return key ? actionMap[key] : { icon: 'question', color: 'gray' };
};

/**
 * 安全调用合约方法，适用于ethers v6版本
 * @param {Object} contract 合约对象
 * @param {string} methodName 方法名称 
 * @param {Array} args 参数数组
 * @returns {Promise<any>} 调用结果
 */
export const safeContractCall = async (contract, methodName, args = []) => {
  if (!contract) {
    console.error('合约对象为空');
    throw new Error('合约对象为空');
  }
  
  console.log(`尝试调用合约方法: ${methodName}，参数:`, args);
  
  // 特殊处理特定方法
  const specialMethods = {
    'getPolicyCount': 0,  // 默认返回0个策略
    'getPolicyInfo': {    // 默认返回空策略
      policyId: 0,
      owner: '0x0000000000000000000000000000000000000000',
      policyName: '默认策略',
      resource: '资源',
      action: '读取',
      isActive: true
    },
    'getPolicyConditionIds': []  // 默认返回空条件列表
  };
  
  // 检查合约是否有getAddress方法和interface属性
  const hasGetAddress = typeof contract.getAddress === 'function';
  const hasInterface = contract.interface !== undefined;
  
  console.log('合约对象类型:', typeof contract);
  console.log('合约是否有getAddress方法:', hasGetAddress);
  console.log('合约是否有interface属性:', hasInterface);
  
  // 如果合约不完整，返回特殊方法的默认值
  if (!hasGetAddress || !hasInterface) {
    if (specialMethods.hasOwnProperty(methodName)) {
      console.warn(`合约接口不完整，但为特殊方法 ${methodName} 返回默认值`);
      return specialMethods[methodName];
    }
    throw new Error('合约接口不完整');
  }
  
  // 获取合约地址
  let contractAddress;
  try {
    contractAddress = await contract.getAddress();
    console.log(`合约地址: ${contractAddress}`);
  } catch (error) {
    console.error('获取合约地址失败:', error);
    
    if (specialMethods.hasOwnProperty(methodName)) {
      console.warn(`合约地址无效，但为特殊方法 ${methodName} 返回默认值`);
      return specialMethods[methodName];
    }
    throw new Error(`合约地址无效: ${error.message}`);
  }
  
  try {
    // 直接处理getPolicyCount方法，手动调用
    if (methodName === 'getPolicyCount') {
      try {
        console.log('使用专门处理方式调用getPolicyCount...');
        // 尝试直接调用
        const callResult = await contract.runner.call({
          to: contractAddress,
          data: contract.interface.encodeFunctionData('getPolicyCount', [])
        });
        
        // 尝试手动解码结果
        if (callResult === '0x') {
          console.log('getPolicyCount返回空值，默认为0');
          return 0n; // 返回BigInt 0
        }
        
        try {
          // 尝试解码
          const decodedResult = contract.interface.decodeFunctionResult('getPolicyCount', callResult);
          console.log('getPolicyCount结果成功解码:', decodedResult);
          return decodedResult[0]; // 通常结果在数组的第一个元素
        } catch (decodeError) {
          console.error('解码结果失败, 返回默认值0:', decodeError);
          return 0n; // 返回BigInt 0
        }
      } catch (directError) {
        console.error('直接调用getPolicyCount失败:', directError);
        return 0n; // 失败时返回BigInt 0
      }
    }
    
    // 尝试直接调用合约方法 (使用ethers v6 API)
    if (typeof contract[methodName] === 'function') {
      console.log(`直接调用方法: ${methodName}`);
      const result = await contract[methodName](...args);
      console.log(`方法调用成功:`, result);
      return result;
    } else {
      console.warn(`方法 ${methodName} 不是合约的直接函数`);
      
      // 尝试使用ethers v6的方式调用
      if (typeof contract.getFunction === 'function') {
        try {
          const method = contract.getFunction(methodName);
          console.log(`使用getFunction获取方法: ${methodName}`);
          const result = await method(...args);
          console.log(`方法调用成功:`, result);
          return result;
        } catch (getError) {
          console.error(`getFunction调用失败:`, getError);
        }
      }
      
      // 最后尝试低级调用
      if (contract.interface) {
        try {
          // 尝试编码函数调用
          console.log(`尝试手动编码函数调用: ${methodName}`);
          
          // 获取provider
          const provider = contract.runner?.provider || contract.provider;
          if (!provider) {
            throw new Error('找不到provider');
          }
          
          // 尝试不同的签名格式编码函数调用
          let data;
          try {
            data = contract.interface.encodeFunctionData(methodName, args);
          } catch (encodeError) {
            console.warn(`简单编码失败，尝试查找匹配函数:`, encodeError);
            
            // 尝试找到参数数量匹配的函数
            const functions = Object.values(contract.interface.fragments || {})
              .filter(f => f.name === methodName && f.inputs?.length === args.length);
            
            if (functions.length === 0) {
              throw new Error(`找不到匹配的函数: ${methodName}`);
            }
            
            data = contract.interface.encodeFunctionData(functions[0], args);
          }
          
          // 发送调用
          const result = await provider.call({
            to: contractAddress,
            data
          });
          
          // 检查是否为空结果
          if (result === '0x') {
            if (specialMethods.hasOwnProperty(methodName)) {
              console.warn(`收到空结果，为 ${methodName} 返回默认值`);
              return specialMethods[methodName];
            }
            // 对于未指定默认值的方法，尝试根据返回类型提供合理默认值
            return methodName.startsWith('get') ? 0n : null;
          }
          
          // 尝试解码结果
          try {
            const decodedResult = contract.interface.decodeFunctionResult(methodName, result);
            console.log(`低级调用成功:`, decodedResult);
            return decodedResult.length === 1 ? decodedResult[0] : decodedResult;
          } catch (decodeError) {
            console.error(`解码结果失败:`, decodeError);
            if (specialMethods.hasOwnProperty(methodName)) {
              return specialMethods[methodName];
            }
            throw decodeError;
          }
        } catch (lowError) {
          console.error(`低级调用失败:`, lowError);
        }
      }
    }
    
    // 所有尝试都失败了，对于特殊方法返回默认值
    if (specialMethods.hasOwnProperty(methodName)) {
      console.warn(`所有尝试都失败，但为特殊方法 ${methodName} 返回默认值`);
      return specialMethods[methodName];
    }
    
    throw new Error(`无法调用合约方法: ${methodName}`);
  } catch (error) {
    console.error(`合约方法 ${methodName} 调用失败:`, error);
    
    // 对于特殊方法返回默认值
    if (specialMethods.hasOwnProperty(methodName)) {
      console.warn(`方法调用失败，但为特殊方法 ${methodName} 返回默认值`);
      return specialMethods[methodName];
    }
    
    throw error;
  }
}; 