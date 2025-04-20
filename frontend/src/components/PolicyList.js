import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Flex,
  SimpleGrid,
  Card,
  CardBody,
  Button,
  Switch,
  Divider,
  Icon,
  useToast,
  Skeleton,
  SkeletonText,
  Tag,
  TagLabel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { 
  FiShield, 
  FiCheck, 
  FiX, 
  FiAlertTriangle, 
  FiInfo, 
  FiFile,
  FiEdit,
  FiEye
} from 'react-icons/fi';
import { useWeb3 } from '../contexts/Web3Context';
import { formatPolicyStatus, safeContractCall } from '../utils/helpers';

function PolicyList() {
  const { contracts, account, signer } = useWeb3();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingPolicy, setUpdatingPolicy] = useState(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!contracts.policyRegistry) {
        console.error('策略注册表合约未初始化:', contracts);
        throw new Error('策略注册表合约未初始化');
      }
      
      console.log('策略注册表合约:', contracts.policyRegistry);

      // 获取策略数量
      let policyCount;
      try {
        // 使用safeContractCall辅助函数
        policyCount = await safeContractCall(contracts.policyRegistry, 'getPolicyCount');
        console.log('获取到的策略数量:', policyCount);
      } catch (countErr) {
        console.error('调用getPolicyCount错误:', countErr);
        console.log('假设策略数量为0，继续处理...');
        policyCount = 0;
      }
      
      // 确保policyCount是数字
      const count = Number(policyCount) || 0;
      console.log('策略总数:', count);
      
      if (count === 0) {
        console.log('没有找到策略，显示空列表');
        setPolicies([]);
        setLoading(false);
        return;
      }

      // 获取所有策略数据
      const policies = [];
      
      for (let i = 0; i < count; i++) {
        try {
          console.log(`正在获取策略ID=${i}的信息...`);
          
          // 使用safeContractCall辅助函数
          const policy = await safeContractCall(contracts.policyRegistry, 'getPolicyInfo', [i]);
          console.log(`策略ID=${i}的基本信息:`, policy);
          
          // 尝试获取策略条件ID列表
          let conditionIds = [];
          try {
            const conditionIdsResult = await safeContractCall(contracts.policyRegistry, 'getPolicyConditionIds', [i]);
            conditionIds = Array.isArray(conditionIdsResult) ? 
              conditionIdsResult.map(id => Number(id)) : 
              [Number(conditionIdsResult)];
            console.log(`策略ID=${i}的条件ID列表:`, conditionIds);
          } catch (condErr) {
            console.error(`获取策略ID=${i}的条件ID列表失败:`, condErr);
          }
          
          // 构建完整的策略对象
          policies.push({
            id: i,
            policyId: Number(policy.policyId || i),
            name: policy.policyName || '',
            owner: policy.owner || '',
            resource: policy.resource || '',
            action: policy.action || '',
            isActive: policy.isActive || false,
            conditionIds: conditionIds
          });
        } catch (err) {
          console.error(`获取策略ID=${i}失败:`, err);
          // 继续获取下一个策略，不中断流程
        }
      }

      console.log('成功获取的策略:', policies);
      setPolicies(policies);
    } catch (err) {
      console.error('获取策略列表失败:', err);
      setError('获取策略列表失败：' + (err.message || '未知错误'));
      // 显示空列表，不让应用崩溃
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contracts.policyRegistry) {
      fetchPolicies();
    }
  }, [contracts.policyRegistry]);

  const handleToggleStatus = async (policyId, currentStatus) => {
    try {
      setUpdatingPolicy(policyId);
      
      // 确保合约已连接到可签名账户
      if (!signer) {
        throw new Error('未连接到钱包或签名者不可用');
      }
      
      console.log(`切换策略${policyId}状态，当前状态:${currentStatus}`);
      
      // 确保policyId是数值类型
      const numericPolicyId = Number(policyId);
      
      // 使用setPolicyStatus方法而不是togglePolicyStatus
      const tx = await safeContractCall(contracts.policyRegistry, 'setPolicyStatus', [numericPolicyId, !currentStatus]);
      console.log('交易已发送，等待确认...', tx.hash);
      await tx.wait();
      console.log('交易已确认');
      
      toast({
        title: `策略已${currentStatus ? '停用' : '激活'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // 刷新策略列表
      fetchPolicies();
    } catch (err) {
      console.error('切换策略状态失败:', err);
      toast({
        title: '操作失败',
        description: err.message || '切换策略状态时出错',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUpdatingPolicy(null);
    }
  };

  const handleViewDetails = (policy) => {
    setSelectedPolicy(policy);
    onOpen();
  };

  const renderPolicyCard = (policy) => {
    const statusInfo = formatPolicyStatus(policy.isActive);
    const isUpdating = updatingPolicy === policy.policyId;

    return (
      <Card 
        key={policy.policyId} 
        borderRadius="lg" 
        overflow="hidden" 
        boxShadow="md"
        _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
        transition="all 0.2s"
        className="hover-scale card-shadow"
      >
        <CardBody>
          <VStack spacing={3} align="stretch">
            <Flex justify="space-between" align="center">
              <HStack>
                <Icon as={FiShield} color="primary.500" boxSize={5} />
                <Heading size="md" color="gray.700">
                  {policy.name}
                </Heading>
              </HStack>
              <Badge
                px={2}
                py={1}
                borderRadius="full"
                colorScheme={statusInfo.color}
                variant="subtle"
              >
                {statusInfo.label}
              </Badge>
            </Flex>
            
            <Divider />
            
            <Box>
              <HStack mb={2}>
                <Text fontWeight="medium" color="gray.600" fontSize="sm">
                  资源:
                </Text>
                <Text color="gray.700">{policy.resource}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium" color="gray.600" fontSize="sm">
                  操作:
                </Text>
                <Text color="gray.700">{policy.action}</Text>
              </HStack>
            </Box>

            <HStack>
              <Text fontWeight="medium" fontSize="sm" color="gray.600">
                策略ID:
              </Text>
              <Text fontSize="sm" color="gray.500">
                {policy.policyId}
              </Text>
            </HStack>

            <Tag size="sm" variant="outline" colorScheme="blue">
              <TagLabel>{policy.conditionIds.length} 个条件</TagLabel>
            </Tag>
            
            <Divider />
            
            <Flex justify="space-between" align="center">
              <HStack>
                <Button
                  size="sm"
                  leftIcon={<FiEye />}
                  variant="ghost"
                  colorScheme="blue"
                  onClick={() => handleViewDetails(policy)}
                >
                  详情
                </Button>
                <Button
                  size="sm"
                  leftIcon={<FiEdit />}
                  variant="ghost"
                  colorScheme="teal"
                >
                  编辑
                </Button>
              </HStack>
              
              <HStack>
                <Text fontSize="sm" color="gray.600">
                  {policy.isActive ? '激活' : '停用'}
                </Text>
                <Switch
                  colorScheme="green"
                  isChecked={policy.isActive}
                  onChange={() => handleToggleStatus(policy.policyId, policy.isActive)}
                  isDisabled={isUpdating}
                  size="md"
                />
              </HStack>
            </Flex>
          </VStack>
        </CardBody>
      </Card>
    );
  };

  const renderPolicySkeleton = () => (
    <Card borderRadius="lg" overflow="hidden" boxShadow="md">
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Flex justify="space-between" align="center">
            <HStack>
              <Skeleton height="20px" width="20px" />
              <Skeleton height="24px" width="180px" />
            </HStack>
            <Skeleton height="24px" width="60px" />
          </Flex>
          
          <Divider />
          
          <Box>
            <SkeletonText mt="2" noOfLines={2} spacing="2" />
          </Box>
          
          <Skeleton height="20px" width="100px" />
          
          <Divider />
          
          <Flex justify="space-between" align="center">
            <Skeleton height="32px" width="120px" />
            <Skeleton height="24px" width="60px" />
          </Flex>
        </VStack>
      </CardBody>
    </Card>
  );

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" fontWeight="bold" color="gray.700">
          策略列表
        </Heading>
        <Button
          colorScheme="blue"
          size="md"
          onClick={fetchPolicies}
          isLoading={loading}
        >
          刷新
        </Button>
      </Flex>

      {error && (
        <Box 
          p={4} 
          mb={6} 
          bg="red.50" 
          color="red.600" 
          borderRadius="md"
          borderLeft="4px"
          borderLeftColor="red.500"
        >
          <Flex align="center">
            <Icon as={FiAlertTriangle} mr={2} boxSize={5} />
            <Text fontWeight="medium">{error}</Text>
          </Flex>
        </Box>
      )}

      {!loading && policies.length === 0 && !error ? (
        <Box 
          p={8} 
          textAlign="center" 
          borderRadius="lg" 
          bg="gray.50"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Icon as={FiInfo} boxSize={12} color="gray.400" mb={4} />
          <Heading size="md" mb={2} color="gray.600">
            暂无策略
          </Heading>
          <Text color="gray.500">
            点击左侧菜单的"创建策略"来添加您的第一个访问控制策略
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Box key={index}>{renderPolicySkeleton()}</Box>
              ))
            : policies.map(policy => renderPolicyCard(policy))}
        </SimpleGrid>
      )}

      {/* 策略详情模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>
            策略详情
            {selectedPolicy && (
              <Badge
                ml={2}
                colorScheme={selectedPolicy.isActive ? 'green' : 'red'}
              >
                {selectedPolicy.isActive ? '激活' : '停用'}
              </Badge>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedPolicy && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">
                    名称
                  </Text>
                  <Text fontSize="lg" fontWeight="medium">
                    {selectedPolicy.name}
                  </Text>
                </Box>
                
                <Divider />
                
                <Flex justify="space-between">
                  <Box>
                    <Text fontWeight="bold" color="gray.500" fontSize="sm">
                      资源
                    </Text>
                    <Text>{selectedPolicy.resource}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.500" fontSize="sm">
                      操作
                    </Text>
                    <Text>{selectedPolicy.action}</Text>
                  </Box>
                </Flex>
                
                <Divider />
                
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">
                    策略ID
                  </Text>
                  <Text>{selectedPolicy.policyId}</Text>
                </Box>
                
                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="bold" color="gray.500" fontSize="sm">
                      访问条件 ({selectedPolicy.conditionIds.length})
                    </Text>
                  </Flex>
                  
                  {selectedPolicy.conditionIds.length > 0 ? (
                    <VStack spacing={2} align="stretch">
                      {selectedPolicy.conditionIds.map((conditionId, index) => (
                        <Box 
                          key={conditionId} 
                          p={3} 
                          borderRadius="md" 
                          borderWidth="1px"
                          borderColor="gray.200"
                        >
                          <Flex justify="space-between" align="center">
                            <HStack>
                              <Icon as={FiFile} color="blue.500" />
                              <Text fontWeight="medium">条件 #{index + 1}</Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.500">
                              ID: {conditionId}
                            </Text>
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Box 
                      p={3} 
                      borderRadius="md" 
                      bg="gray.50" 
                      textAlign="center"
                    >
                      <Text color="gray.500">无访问条件</Text>
                    </Box>
                  )}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              关闭
            </Button>
            {selectedPolicy && (
              <Button
                colorScheme={selectedPolicy.isActive ? 'red' : 'green'}
                onClick={() => {
                  handleToggleStatus(selectedPolicy.policyId, selectedPolicy.isActive);
                  onClose();
                }}
                leftIcon={selectedPolicy.isActive ? <FiX /> : <FiCheck />}
              >
                {selectedPolicy.isActive ? '停用策略' : '激活策略'}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default PolicyList; 