import React, { useState } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Divider,
  HStack,
  Select,
  Text,
  useToast,
  IconButton,
  Flex,
  Card,
  CardBody,
  Badge,
  FormHelperText,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Tag,
  RadioGroup,
  Radio,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiTrash2, 
  FiChevronDown, 
  FiChevronUp,
  FiSave,
  FiX,
  FiCheck
} from 'react-icons/fi';
import { useWeb3 } from '../contexts/Web3Context';
import { safeContractCall } from '../utils/helpers';
import { ethers } from 'ethers';

const PolicyForm = () => {
  const { contracts, signer, account } = useWeb3();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [policyName, setPolicyName] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  
  // 条件相关状态
  const [conditions, setConditions] = useState([
    {
      contractAddress: '',
      standardType: '',
      chain: 'ethereum',
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      comparator: '>=',
      value: '0'
    }
  ]);
  
  const standardTypes = [
    { value: '', label: '无 (以太坊原生)' },
    { value: 'ERC20', label: 'ERC20 代币' },
    { value: 'ERC721', label: 'ERC721 NFT' },
    { value: 'ERC1155', label: 'ERC1155 多代币标准' }
  ];
  
  const comparators = [
    { value: '==', label: '等于 (==)' },
    { value: '!=', label: '不等于 (!=)' },
    { value: '>', label: '大于 (>)' },
    { value: '<', label: '小于 (<)' },
    { value: '>=', label: '大于等于 (>=)' },
    { value: '<=', label: '小于等于 (<=)' }
  ];
  
  const methods = [
    { value: 'eth_getBalance', label: '以太坊余额' },
    { value: 'balanceOf', label: '代币余额' },
    { value: 'ownerOf', label: 'NFT所有权' }
  ];

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        contractAddress: '',
        standardType: '',
        chain: 'ethereum',
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        comparator: '>=',
        value: '0'
      }
    ]);
  };

  const handleRemoveCondition = (index) => {
    if (conditions.length <= 1) return;
    
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
  };

  const handleConditionChange = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    
    // 根据方法自动设置适当的参数
    if (field === 'method') {
      if (value === 'eth_getBalance') {
        newConditions[index].parameters = [':userAddress', 'latest'];
      } else if (value === 'balanceOf') {
        newConditions[index].parameters = [':userAddress'];
      } else if (value === 'ownerOf') {
        newConditions[index].parameters = ['1']; // 默认为 tokenId 1
      }
    }
    
    // 根据标准类型设置适当的方法
    if (field === 'standardType') {
      if (value === 'ERC20' || value === 'ERC1155') {
        newConditions[index].method = 'balanceOf';
        newConditions[index].parameters = [':userAddress'];
        
        // 为ERC1155添加tokenId参数
        if (value === 'ERC1155') {
          newConditions[index].parameters.push('1');
        }
      } else if (value === 'ERC721') {
        newConditions[index].method = 'ownerOf';
        newConditions[index].parameters = ['1'];
      } else {
        newConditions[index].method = 'eth_getBalance';
        newConditions[index].parameters = [':userAddress', 'latest'];
      }
    }
    
    setConditions(newConditions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (!policyName || !resource || !action) {
        throw new Error('请填写所有必填字段');
      }

      // 检查MetaMask连接
      if (!window.ethereum || !window.ethereum.isConnected()) {
        console.error('MetaMask未连接');
        throw new Error('MetaMask未连接，请确保已安装MetaMask并连接到本网站');
      }

      // 检查合约实例和签名者是否存在
      if (!contracts.policyRegistry) {
        console.error('合约实例不存在:', contracts);
        throw new Error('合约未初始化，请尝试刷新页面或重新连接钱包');
      }
      
      if (!signer) {
        console.error('签名者不存在');
        
        // 尝试重新获取签名者
        try {
          console.log('尝试重新请求MetaMask授权...');
          
          // 强制请求MetaMask授权
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          if (!accounts || accounts.length === 0) {
            throw new Error('未能获取MetaMask账户');
          }
          
          toast({
            title: '已请求MetaMask授权',
            description: '账户已获取，正在刷新连接状态...',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          
          // 等待1秒，让UI更新
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 刷新页面以重新初始化
          window.location.reload();
          setIsSubmitting(false);
          return; // 中断执行
        } catch (ethError) {
          console.error('MetaMask授权失败:', ethError);
          throw new Error('未找到签名者，请确保已授权MetaMask钱包并刷新页面');
        }
      }
      
      console.log('开始创建策略流程...');
      console.log('策略名称:', policyName);
      console.log('资源:', resource);
      console.log('操作:', action);
      console.log('条件数量:', conditions.length);
      
      try {
        // 获取当前账户地址
        const signerAddr = await signer.getAddress();
        console.log('发送交易的账户:', signerAddr);
        
        // 打印合约地址和接口信息
        const contractAddress = await contracts.policyRegistry.getAddress();
        console.log('合约地址:', contractAddress);
        console.log('合约接口:', contracts.policyRegistry.interface ? '存在' : '不存在');
        
        // 检查MetaMask是否有正确的网络
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('当前ChainID:', chainId);
        if (chainId !== '0x539' && chainId !== '0x7a69') { // 0x539 = 1337, 0x7a69 = 31337
          console.error('错误的网络:', chainId);
          
          // 尝试切换网络
          try {
            toast({
              title: '网络切换',
              description: '正在尝试切换到本地网络，请在MetaMask中确认',
              status: 'info',
              duration: 5000,
              isClosable: true,
            });
            
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x539' }], // 十六进制的1337
            });
            
            // 给用户一些时间来确认网络切换
            toast({
              title: '网络已切换',
              description: '请确认MetaMask网络切换后重试',
              status: 'info',
              duration: 5000,
              isClosable: true,
            });
            
            // 等待2秒，让网络切换完成
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 刷新页面以使用新网络
            window.location.reload();
            setIsSubmitting(false);
            return; // 中断执行
          } catch (switchError) {
            console.error('网络切换失败:', switchError);
            throw new Error('请在MetaMask中切换到localhost:8545网络后重试');
          }
        }
        
        // 验证合约是否部署在当前网络上
        try {
          const code = await signer.provider.getCode(contractAddress);
          if (code === '0x' || code.length <= 2) {
            console.error('合约字节码不存在，合约可能未部署');
            throw new Error('合约可能未部署在当前网络上，请确保Hardhat节点正在运行并且合约已部署');
          }
        } catch (codeError) {
          console.error('获取合约字节码失败:', codeError);
        }
        
        // 设置交易选项，确保有足够的gas
        const txOptions = {
          gasLimit: 3000000, // 设置足够高的gas限制
        };
        
        // 调用合约创建策略
        console.log('调用createPolicy方法...');
        console.log('交易选项:', txOptions);
        
        // 确保用户看到MetaMask弹窗
        toast({
          title: '请在MetaMask中确认交易',
          description: '请查看并确认MetaMask弹出的交易请求',
          status: 'info',
          duration: 7000,
          isClosable: true,
        });
        
        // 使用低级调用
        try {
          console.log('使用低级方式调用createPolicy...');
          
          // 编码函数调用数据
          const data = contracts.policyRegistry.interface.encodeFunctionData('createPolicy', [
            policyName,
            resource,
            action
          ]);
          
          // 准备交易参数
          const txParams = {
            to: contractAddress,
            from: signerAddr,
            data,
            gas: ethers.toQuantity(3000000), // 使用十六进制表示gas限制
          };
          
          // 使用window.ethereum直接发送交易
          console.log('发送交易参数:', txParams);
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [txParams]
          });
          
          console.log('交易已发送，交易哈希:', txHash);
          
          // 通知用户交易已发送
          toast({
            title: '交易已发送',
            description: `交易哈希: ${txHash.slice(0, 10)}...`,
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          
          // 等待交易确认
          const waitForTransaction = async (hash, maxAttempts = 30) => {
            console.log(`等待交易 ${hash} 确认，最多尝试 ${maxAttempts} 次`);
            
            for (let i = 0; i < maxAttempts; i++) {
              try {
                const receipt = await signer.provider.getTransactionReceipt(hash);
                if (receipt) {
                  console.log(`交易已确认，区块号: ${receipt.blockNumber}`);
                  return receipt;
                }
              } catch (error) {
                console.warn(`第 ${i+1} 次获取收据失败:`, error);
              }
              
              // 等待3秒后重试
              await new Promise(resolve => setTimeout(resolve, 3000));
              console.log(`第 ${i+1} 次尝试获取交易收据...`);
            }
            
            throw new Error(`交易 ${hash} 在 ${maxAttempts} 次尝试后仍未确认`);
          };
          
          // 等待交易确认
          const receipt = await waitForTransaction(txHash);
          
          // 通知用户交易已确认
          toast({
            title: '交易已确认',
            description: `区块号: ${receipt.blockNumber}`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          
          // 获取策略ID
          let policyId = 0;
          try {
            // 尝试读取策略总数作为策略ID
            const policyCountData = contracts.policyRegistry.interface.encodeFunctionData('getPolicyCount', []);
            const policyCountResult = await signer.provider.call({
              to: contractAddress,
              data: policyCountData
            });
            
            // 如果有返回值，解码
            if (policyCountResult && policyCountResult !== '0x') {
              const decodedCount = contracts.policyRegistry.interface.decodeFunctionResult('getPolicyCount', policyCountResult);
              policyId = Number(decodedCount[0]) - 1; // 最新策略ID应该是总数-1
              console.log('从getPolicyCount获取的策略ID:', policyId);
            } else {
              console.log('getPolicyCount返回空值，使用默认ID 0');
            }
          } catch (idError) {
            console.error('获取策略ID失败:', idError);
            console.log('使用默认策略ID: 0');
          }
          
          // 添加所有条件
          if (conditions.length > 0) {
            console.log(`开始为策略${policyId}添加${conditions.length}个条件`);
            
            for (let i = 0; i < conditions.length; i++) {
              const condition = conditions[i];
              try {
                console.log(`添加条件${i+1}/${conditions.length}:`, condition);
                
                // 确保参数是字符串数组
                const parameters = Array.isArray(condition.parameters) 
                  ? condition.parameters 
                  : [':userAddress', 'latest']; // 默认参数
                
                // 替换参数中的:userAddress占位符
                const processedParameters = parameters.map(param => 
                  param === ':userAddress' && account ? account : param
                );
                
                // 编码addCondition调用
                const conditionData = contracts.policyRegistry.interface.encodeFunctionData('addCondition', [
                  policyId,
                  condition.contractAddress || '',
                  condition.standardType || '',
                  condition.chain || 'ethereum',
                  condition.method || 'eth_getBalance',
                  processedParameters,
                  condition.comparator || '>=',
                  condition.value || '0'
                ]);
                
                // 准备条件交易参数
                const conditionTxParams = {
                  to: contractAddress,
                  from: signerAddr,
                  data: conditionData,
                  gas: ethers.toQuantity(3000000),
                };
                
                // 通知用户确认条件交易
                toast({
                  title: `请确认条件 ${i+1}`,
                  description: '请在MetaMask中确认添加条件的交易',
                  status: 'info',
                  duration: 5000,
                  isClosable: true,
                });
                
                // 发送条件交易
                const conditionTxHash = await window.ethereum.request({
                  method: 'eth_sendTransaction',
                  params: [conditionTxParams]
                });
                
                console.log(`条件${i+1}交易已发送，交易哈希:`, conditionTxHash);
                
                // 等待条件交易确认
                const conditionReceipt = await waitForTransaction(conditionTxHash);
                console.log(`条件${i+1}已确认，交易哈希:`, conditionReceipt.hash);
                
                toast({
                  title: `条件${i+1}已添加`,
                  description: `交易已确认，区块号: ${conditionReceipt.blockNumber}`,
                  status: 'success',
                  duration: 3000,
                  isClosable: true,
                });
                
              } catch (conditionError) {
                console.error(`添加条件${i+1}失败:`, conditionError);
                toast({
                  title: `条件${i+1}添加失败`,
                  description: conditionError.message || `条件${i+1}添加失败，将继续添加其他条件`,
                  status: 'warning',
                  duration: 5000,
                  isClosable: true,
                });
                // 继续添加其他条件，不中断流程
              }
            }
          }
          
          // 显示成功消息
          setSuccess(true);
          toast({
            title: '策略创建成功',
            description: `策略 "${policyName}" 已成功创建，ID: ${policyId}`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          
          // 重置表单
          setPolicyName('');
          setResource('');
          setAction('');
          setConditions([
            {
              contractAddress: '',
              standardType: '',
              chain: 'ethereum',
              method: 'eth_getBalance',
              parameters: [':userAddress', 'latest'],
              comparator: '>=',
              value: '0'
            }
          ]);
        } catch (lowLevelError) {
          console.error('低级交易调用失败:', lowLevelError);
          throw new Error(`交易失败: ${lowLevelError.message}`);
        }
      } catch (err) {
        console.error('创建策略失败:', err);
        
        // 详细解析错误信息
        let errorMessage = err.message || '创建策略失败，请稍后再试';
        
        // 检查常见错误类型
        if (errorMessage.includes('user rejected transaction')) {
          errorMessage = '交易被用户拒绝';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = '账户余额不足，无法支付Gas费用';
        } else if (errorMessage.includes('gas required exceeds allowance')) {
          errorMessage = 'Gas费用超出限制，请增加Gas限制';
        } else if (errorMessage.includes('nonce too low')) {
          errorMessage = '交易nonce过低，请刷新页面重试';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = '交易确认超时，请检查MetaMask中的交易状态';
        }
        
        setError(errorMessage);
        
        toast({
          title: '创建失败',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('创建策略失败:', err);
      setError(err.message || '创建策略失败，请稍后再试');
      
      toast({
        title: '创建失败',
        description: err.message || '创建策略失败，请稍后再试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={6} color="gray.700">
        创建新策略
      </Heading>
      
      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>错误！</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <CloseButton 
            position="absolute" 
            right="8px" 
            top="8px" 
            onClick={() => setError(null)}
          />
        </Alert>
      )}
      
      {success && (
        <Alert status="success" mb={6} borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>成功！</AlertTitle>
          <AlertDescription>策略已成功创建。</AlertDescription>
          <CloseButton 
            position="absolute" 
            right="8px" 
            top="8px" 
            onClick={() => setSuccess(false)}
          />
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">
          <Card variant="outline" borderRadius="lg">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="primary.600">
                  基本信息
                </Heading>
                
                <FormControl isRequired>
                  <FormLabel>策略名称</FormLabel>
                  <Input 
                    placeholder="输入策略名称"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                  />
                </FormControl>
                
                <HStack>
                  <FormControl isRequired>
                    <FormLabel>资源</FormLabel>
                    <Input 
                      placeholder="资源标识符"
                      value={resource}
                      onChange={(e) => setResource(e.target.value)}
                    />
                    <FormHelperText>
                      例如: "文件系统"、"数据库"等
                    </FormHelperText>
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>操作</FormLabel>
                    <Input 
                      placeholder="操作类型"
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                    />
                    <FormHelperText>
                      例如: "read"、"write"、"delete"等
                    </FormHelperText>
                  </FormControl>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
          
          <Card variant="outline" borderRadius="lg">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="md" color="primary.600">
                    访问条件
                  </Heading>
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddCondition}
                  >
                    添加条件
                  </Button>
                </Flex>
                
                <Divider />

                {conditions.map((condition, index) => (
                  <Box 
                    key={index}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="gray.200"
                    position="relative"
                  >
                    <Flex justify="space-between" mb={4}>
                      <Badge colorScheme="blue">条件 #{index + 1}</Badge>
                      {conditions.length > 1 && (
                        <IconButton
                          icon={<FiTrash2 />}
                          variant="ghost"
                          colorScheme="red"
                          size="sm"
                          aria-label="删除条件"
                          onClick={() => handleRemoveCondition(index)}
                        />
                      )}
                    </Flex>
                    
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>标准类型</FormLabel>
                        <Select
                          value={condition.standardType}
                          onChange={(e) => handleConditionChange(index, 'standardType', e.target.value)}
                        >
                          {standardTypes.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      
                      {condition.standardType && (
                        <FormControl>
                          <FormLabel>合约地址</FormLabel>
                          <Input
                            placeholder="输入合约地址"
                            value={condition.contractAddress}
                            onChange={(e) => handleConditionChange(index, 'contractAddress', e.target.value)}
                          />
                        </FormControl>
                      )}
                      
                      <FormControl>
                        <FormLabel>方法</FormLabel>
                        <Select
                          value={condition.method}
                          onChange={(e) => handleConditionChange(index, 'method', e.target.value)}
                        >
                          {methods.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>比较运算符</FormLabel>
                        <Select
                          value={condition.comparator}
                          onChange={(e) => handleConditionChange(index, 'comparator', e.target.value)}
                        >
                          {comparators.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>比较值</FormLabel>
                        <Input
                          placeholder="输入比较值"
                          value={condition.value}
                          onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                        />
                        <FormHelperText>
                          例如: "0"表示任何余额, "1000000000000000000"表示1 ETH (使用wei为单位)
                        </FormHelperText>
                      </FormControl>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
          
          <Flex justify="flex-end">
            <Button
              mr={4}
              variant="outline"
              colorScheme="red"
              size="lg"
              leftIcon={<FiX />}
              onClick={() => {
                if (isSubmitting) {
                  if (window.confirm('确定要取消正在进行的操作吗？这不会取消已发送的交易，但会重置表单状态。')) {
                    setIsSubmitting(false);
                    toast({
                      title: '操作已中断',
                      description: '表单状态已重置，但请在MetaMask中检查交易状态',
                      status: 'warning',
                      duration: 5000,
                      isClosable: true,
                    });
                  }
                } else {
                  setPolicyName('');
                  setResource('');
                  setAction('');
                  setConditions([
                    {
                      contractAddress: '',
                      standardType: '',
                      chain: 'ethereum',
                      method: 'eth_getBalance',
                      parameters: [':userAddress', 'latest'],
                      comparator: '>=',
                      value: '0'
                    }
                  ]);
                  setError(null);
                  setSuccess(false);
                }
              }}
              disabled={false}
            >
              {isSubmitting ? '中断操作' : '重置表单'}
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              leftIcon={<FiSave />}
              isLoading={isSubmitting}
              loadingText="正在创建..."
            >
              创建策略
            </Button>
          </Flex>
        </VStack>
      </form>
    </Box>
  );
};

export default PolicyForm; 