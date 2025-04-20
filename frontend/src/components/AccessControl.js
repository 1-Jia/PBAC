import React, { useState } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Select,
  Text,
  Icon,
  useToast,
  Spinner,
  Badge,
  useColorModeValue,
  Switch
} from '@chakra-ui/react';
import { 
  FiCheck, 
  FiX, 
  FiShield, 
  FiLock, 
  FiUnlock,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { useWeb3 } from '../contexts/Web3Context';
import { safeContractCall } from '../utils/helpers';

const AccessControl = () => {
  const { contracts, signer, account } = useWeb3();
  const toast = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // 访问检查表单状态
  const [userAddress, setUserAddress] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  
  // 策略评估表单状态
  const [policyId, setPolicyId] = useState('');
  const [evaluationAddress, setEvaluationAddress] = useState('');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const successBg = useColorModeValue('green.50', 'green.900');
  const successBorder = useColorModeValue('green.500', 'green.300');
  const errorBg = useColorModeValue('red.50', 'red.900');
  const errorBorder = useColorModeValue('red.500', 'red.300');

  const handleAccessCheck = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setResult(null);
    setError(null);

    try {
      if (!userAddress || !resource || !action) {
        throw new Error('请填写所有必填字段');
      }

      if (!contracts.accessControl || !signer) {
        throw new Error('合约或签名者未初始化');
      }
      
      console.log('开始检查访问权限...');
      console.log('用户地址:', userAddress);
      console.log('资源:', resource);
      console.log('操作:', action);
      
      // 调用检查访问权限方法
      const tx = await contracts.accessControl.checkAccess(
        userAddress,
        resource,
        action
      );
      
      console.log('交易已发送，等待确认...', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log('交易已确认, 区块号:', receipt.blockNumber);
      
      // 从事件中获取结果
      let granted = false;
      
      try {
        // 尝试从返回值直接获取结果
        granted = await contracts.accessControl.callStatic.checkAccess(
          userAddress,
          resource,
          action
        );
        console.log('从callStatic获取到访问结果:', granted);
      } catch (callError) {
        console.error('无法从callStatic获取结果:', callError);
        
        // 尝试从事件中解析
        try {
          const accessEvent = receipt.logs
            .filter(log => {
              try {
                const parsedLog = contracts.accessControl.interface.parseLog({
                  topics: log.topics,
                  data: log.data
                });
                return parsedLog && parsedLog.name === 'AccessChecked';
              } catch (err) {
                return false;
              }
            })[0];
            
          if (accessEvent) {
            const parsedLog = contracts.accessControl.interface.parseLog({
              topics: accessEvent.topics,
              data: accessEvent.data
            });
            granted = parsedLog.args[3]; // 假设第4个参数是granted
            console.log('从事件中解析到访问结果:', granted);
          } else {
            console.warn('未找到AccessChecked事件');
            granted = false; // 默认拒绝
          }
        } catch (eventError) {
          console.error('解析事件日志失败:', eventError);
          granted = false; // 默认拒绝
        }
      }
      
      setResult(granted);
      
      toast({
        title: granted ? '访问被允许' : '访问被拒绝',
        description: `用户 ${userAddress.slice(0, 6)}...${userAddress.slice(-4)} ${granted ? '可以' : '不能'} 对 ${resource} 执行 ${action} 操作`,
        status: granted ? 'success' : 'warning',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('检查访问权限失败:', err);
      setError(err.message || '检查访问权限失败，请稍后再试');
      
      toast({
        title: '检查失败',
        description: err.message || '检查访问权限失败，请稍后再试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handlePolicyEvaluation = async (e) => {
    e.preventDefault();
    setIsEvaluating(true);
    setEvaluationResult(null);
    setError(null);

    try {
      if (!policyId || !evaluationAddress) {
        throw new Error('请填写所有必填字段');
      }

      if (!contracts.accessControl || !signer) {
        throw new Error('合约或签名者未初始化');
      }
      
      console.log('开始评估策略...');
      console.log('策略ID:', policyId);
      console.log('用户地址:', evaluationAddress);
      
      // 调用检查特定策略方法
      const tx = await contracts.accessControl.checkPolicyForUser(
        policyId,
        evaluationAddress
      );
      
      console.log('交易已发送，等待确认...', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log('交易已确认, 区块号:', receipt.blockNumber);
      
      // 从callStatic中获取结果
      let result;
      
      try {
        // 尝试从返回值直接获取结果
        result = await contracts.accessControl.callStatic.checkPolicyForUser(
          policyId,
          evaluationAddress
        );
        console.log('从callStatic获取到策略评估结果:', result);
      } catch (callError) {
        console.error('无法从callStatic获取结果:', callError);
        
        // 尝试从事件中解析
        try {
          const policyEvent = receipt.logs
            .filter(log => {
              try {
                const parsedLog = contracts.accessControl.interface.parseLog({
                  topics: log.topics,
                  data: log.data
                });
                return parsedLog && parsedLog.name === 'PolicyEnforced';
              } catch (err) {
                return false;
              }
            })[0];
            
          if (policyEvent) {
            const parsedLog = contracts.accessControl.interface.parseLog({
              topics: policyEvent.topics,
              data: policyEvent.data
            });
            result = parsedLog.args[2]; // 假设第3个参数是结果
            console.log('从事件中解析到策略评估结果:', result);
          } else {
            console.warn('未找到PolicyEnforced事件');
            result = false; // 默认策略不满足
          }
        } catch (eventError) {
          console.error('解析事件日志失败:', eventError);
          result = false; // 默认策略不满足
        }
      }
      
      setEvaluationResult(result);
      
      toast({
        title: `策略评估完成`,
        description: `策略 #${policyId} 对用户 ${evaluationAddress.slice(0, 6)}...${evaluationAddress.slice(-4)} 的评估结果: ${result ? '满足条件' : '不满足条件'}`,
        status: result ? 'success' : 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('策略评估失败:', err);
      setError(err.message || '策略评估失败，请稍后再试');
      
      toast({
        title: '评估失败',
        description: err.message || '策略评估失败，请稍后再试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUseCurrentAccount = () => {
    if (account) {
      setUserAddress(account);
      setEvaluationAddress(account);
    }
  };

  const checkAccess = async () => {
    if (!userAddress || !resource || !action) {
      toast({
        title: '输入错误',
        description: '请填写所有必填字段',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!contracts.accessControl) {
      toast({
        title: '合约未连接',
        description: '请确保已连接到钱包并且合约已加载',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsChecking(true);
      setResult(null);

      console.log('调用checkAccess, 参数:', userAddress, resource, action);
      const hasAccess = await safeContractCall(
        contracts.accessControl, 
        'checkAccess', 
        [userAddress, resource, action]
      );
      
      console.log('访问检查结果:', hasAccess);
      
      setResult({
        type: 'access',
        granted: hasAccess,
        userAddress,
        resource,
        action
      });
      
      toast({
        title: '检查完成',
        description: `用户${hasAccess ? '有权' : '无权'}访问指定资源`,
        status: hasAccess ? 'success' : 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('访问检查失败:', error);
      toast({
        title: '检查失败',
        description: error.message || '检查访问权限时出错',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const checkPolicy = async () => {
    if (!userAddress || isNaN(policyId) || policyId === '') {
      toast({
        title: '输入错误',
        description: '请填写有效的策略ID和用户地址',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!contracts.accessControl) {
      toast({
        title: '合约未连接',
        description: '请确保已连接到钱包并且合约已加载',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsEvaluating(true);
      setEvaluationResult(null);

      console.log('调用checkPolicyForUser, 参数:', policyId, userAddress);
      const meets = await safeContractCall(
        contracts.accessControl, 
        'checkPolicyForUser', 
        [Number(policyId), userAddress]
      );
      
      console.log('策略检查结果:', meets);
      
      setEvaluationResult(meets);
      
      toast({
        title: '检查完成',
        description: `用户${meets ? '满足' : '不满足'}策略条件`,
        status: meets ? 'success' : 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('策略检查失败:', error);
      toast({
        title: '检查失败',
        description: error.message || '检查策略条件时出错',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.type === 'access') {
      return (
        <Card mt={6} variant="filled" bg={result.granted ? 'green.50' : 'red.50'}>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Flex align="center">
                <Icon 
                  as={result.granted ? FiCheck : FiX} 
                  color={result.granted ? 'green.500' : 'red.500'} 
                  boxSize={6} 
                  mr={2} 
                />
                <Heading size="md" color={result.granted ? 'green.700' : 'red.700'}>
                  访问{result.granted ? '允许' : '拒绝'}
                </Heading>
              </Flex>
              
              <Divider />
              
              <HStack>
                <Text fontWeight="bold">用户地址:</Text>
                <Text>{result.userAddress}</Text>
              </HStack>
              
              <HStack>
                <Text fontWeight="bold">资源:</Text>
                <Text>{result.resource}</Text>
              </HStack>
              
              <HStack>
                <Text fontWeight="bold">操作:</Text>
                <Text>{result.action}</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      );
    } else if (result.type === 'policy') {
      return (
        <Card mt={6} variant="filled" bg={result.granted ? 'green.50' : 'red.50'}>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Flex align="center">
                <Icon 
                  as={result.granted ? FiCheck : FiX} 
                  color={result.granted ? 'green.500' : 'red.500'} 
                  boxSize={6} 
                  mr={2} 
                />
                <Heading size="md" color={result.granted ? 'green.700' : 'red.700'}>
                  用户{result.granted ? '满足' : '不满足'}策略条件
                </Heading>
              </Flex>
              
              <Divider />
              
              <HStack>
                <Text fontWeight="bold">用户地址:</Text>
                <Text>{result.userAddress}</Text>
              </HStack>
              
              <HStack>
                <Text fontWeight="bold">策略ID:</Text>
                <Text>{result.policyId}</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      );
    }
    
    return null;
  };

  return (
    <Box>
      <Heading size="lg" mb={6} color="gray.700">
        访问控制
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
      
      <HStack spacing={6} align="flex-start" flexDirection={{ base: 'column', md: 'row' }}>
        {/* 访问权限检查 */}
        <Box flex="1" w={{ base: '100%', md: 'auto' }}>
          <Card borderRadius="lg" variant="outline" overflow="hidden" mb={{ base: 6, md: 0 }}>
            <CardHeader bg="primary.50" py={4}>
              <Flex align="center">
                <Icon as={FiShield} color="primary.600" boxSize={5} mr={2} />
                <Heading size="md" color="primary.700">访问权限检查</Heading>
              </Flex>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleAccessCheck}>
                <VStack spacing={5} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>用户地址</FormLabel>
                    <Input 
                      placeholder="输入以太坊地址" 
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                    />
                  </FormControl>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleUseCurrentAccount}
                    isDisabled={!account}
                    alignSelf="flex-start"
                  >
                    使用当前账户
                  </Button>
                  
                  <FormControl isRequired>
                    <FormLabel>资源</FormLabel>
                    <Input 
                      placeholder="资源标识符" 
                      value={resource}
                      onChange={(e) => setResource(e.target.value)}
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>操作</FormLabel>
                    <Input 
                      placeholder="操作类型" 
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                    />
                  </FormControl>
                  
                  <Button
                    colorScheme="blue"
                    type="submit"
                    isLoading={isChecking}
                    loadingText="检查中..."
                  >
                    检查权限
                  </Button>
                  
                  {result !== null && (
                    <Box 
                      mt={4} 
                      p={4} 
                      borderRadius="md" 
                      bg={result ? successBg : errorBg}
                      borderWidth="1px"
                      borderColor={result ? successBorder : errorBorder}
                    >
                      <Flex align="center">
                        <Icon 
                          as={result ? FiCheck : FiX} 
                          color={result ? 'green.500' : 'red.500'} 
                          boxSize={5} 
                          mr={3}
                        />
                        <Text fontWeight="medium">
                          {result ? '访问被允许' : '访问被拒绝'}
                        </Text>
                      </Flex>
                      <Text mt={2} fontSize="sm">
                        用户 <Text as="span" fontWeight="bold">{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</Text> {result ? '可以' : '不能'} 对资源 <Text as="span" fontWeight="bold">{resource}</Text> 执行 <Text as="span" fontWeight="bold">{action}</Text> 操作
                      </Text>
                    </Box>
                  )}
                </VStack>
              </form>
            </CardBody>
          </Card>
        </Box>
        
        {/* 策略评估 */}
        <Box flex="1" w={{ base: '100%', md: 'auto' }}>
          <Card borderRadius="lg" variant="outline" overflow="hidden">
            <CardHeader bg="blue.50" py={4}>
              <Flex align="center">
                <Icon as={FiLock} color="blue.600" boxSize={5} mr={2} />
                <Heading size="md" color="blue.700">策略评估</Heading>
              </Flex>
            </CardHeader>
            <CardBody>
              <form onSubmit={handlePolicyEvaluation}>
                <VStack spacing={5} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>策略ID</FormLabel>
                    <Input 
                      placeholder="输入策略ID" 
                      type="number"
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>用户地址</FormLabel>
                    <Input 
                      placeholder="输入以太坊地址" 
                      value={evaluationAddress}
                      onChange={(e) => setEvaluationAddress(e.target.value)}
                    />
                  </FormControl>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleUseCurrentAccount}
                    isDisabled={!account}
                    alignSelf="flex-start"
                  >
                    使用当前账户
                  </Button>
                  
                  <Button
                    colorScheme="blue"
                    type="submit"
                    isLoading={isEvaluating}
                    loadingText="评估中..."
                    mt={2}
                  >
                    评估策略
                  </Button>
                  
                  {evaluationResult !== null && (
                    <Box 
                      mt={4} 
                      p={4} 
                      borderRadius="md" 
                      bg={evaluationResult ? successBg : errorBg}
                      borderWidth="1px"
                      borderColor={evaluationResult ? successBorder : errorBorder}
                    >
                      <Flex align="center">
                        <Icon 
                          as={evaluationResult ? FiCheckCircle : FiAlertCircle} 
                          color={evaluationResult ? 'green.500' : 'red.500'} 
                          boxSize={5} 
                          mr={3}
                        />
                        <Text fontWeight="medium">
                          {evaluationResult ? '满足策略条件' : '不满足策略条件'}
                        </Text>
                      </Flex>
                      <Text mt={2} fontSize="sm">
                        策略ID <Text as="span" fontWeight="bold">#{policyId}</Text> 对用户 <Text as="span" fontWeight="bold">{evaluationAddress.slice(0, 6)}...{evaluationAddress.slice(-4)}</Text> 的评估结果: {evaluationResult ? '通过' : '未通过'}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </form>
            </CardBody>
          </Card>
        </Box>
      </HStack>
      
      {renderResult()}
    </Box>
  );
};

export default AccessControl; 