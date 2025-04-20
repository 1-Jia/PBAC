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

      if (!contracts.policyRegistry || !signer) {
        throw new Error('合约或签名者未初始化');
      }
      
      console.log('开始创建策略流程...');
      console.log('策略名称:', policyName);
      console.log('资源:', resource);
      console.log('操作:', action);
      console.log('条件数量:', conditions.length);
      
      // 连接签名者
      console.log('连接签名者...');
      const policyRegistryWithSigner = contracts.policyRegistry;
      
      // 创建策略
      console.log('发送创建策略交易...');
      const tx = await safeContractCall(
        contracts.policyRegistry,
        'createPolicy',
        [policyName, resource, action]
      );
      
      console.log('交易已发送，等待确认...');
      console.log('交易哈希:', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log('交易已确认, 区块号:', receipt.blockNumber);
      
      // 从事件中获取策略ID
      const event = receipt.logs
        .filter(log => 
          log.topics[0] === contracts.policyRegistry.interface.getEvent('PolicyCreated').topicHash
        )
        .map(log => {
          try {
            return contracts.policyRegistry.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
          } catch (e) {
            console.error('解析事件日志失败:', e);
            return null;
          }
        })
        .filter(Boolean)[0];

      let policyId;
      if (event && event.args) {
        policyId = event.args[0];
        console.log("解析到策略ID:", policyId.toString());
      } else {
        // 如果无法从事件中获取，尝试获取最新的策略ID
        const policyCount = await safeContractCall(contracts.policyRegistry, 'getPolicyCount');
        policyId = Number(policyCount) - 1;
        console.log("使用备选方案获取策略ID:", policyId.toString());
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
            
            const conditionTx = await safeContractCall(
              contracts.policyRegistry,
              'addCondition',
              [
                policyId,
                condition.contractAddress || '',
                condition.standardType || '',
                condition.chain || 'ethereum',
                condition.method || 'eth_getBalance',
                processedParameters,
                condition.comparator || '>=',
                condition.value || '0'
              ]
            );
            
            console.log(`条件${i+1}交易已发送，等待确认...`);
            const conditionReceipt = await conditionTx.wait();
            console.log(`条件${i+1}已确认，交易哈希:`, conditionReceipt.hash);
          } catch (conditionError) {
            console.error(`添加条件${i+1}失败:`, conditionError);
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