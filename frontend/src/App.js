import React, { useState, useEffect } from 'react';
import { Box, Flex, VStack, Heading, Text, useDisclosure, Spinner, useToast } from '@chakra-ui/react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ConnectWallet from './components/ConnectWallet';
import PolicyList from './components/PolicyList';
import PolicyForm from './components/PolicyForm';
import AccessControl from './components/AccessControl';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import './App.css';

// 主应用组件内容
function AppContent() {
  const [activeSection, setActiveSection] = useState('policies');
  const [loading, setLoading] = useState(true);
  const { isConnected, account, contracts, provider } = useWeb3();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // 验证合约连接
  useEffect(() => {
    const verifyContractConnection = async () => {
      try {
        if (isConnected && contracts.policyRegistry) {
          console.log('验证策略注册表合约连接...');
          
          // 尝试获取合约地址
          const address = await contracts.policyRegistry.getAddress();
          console.log('策略注册表合约地址:', address);
          
          // 尝试获取合约函数
          if (contracts.policyRegistry.interface) {
            const functions = Object.keys(contracts.policyRegistry.interface.functions || {});
            console.log('合约可用函数:', functions.slice(0, 5));
            
            // 检查是否包含关键函数
            const hasPolicyCount = functions.some(f => f.startsWith('getPolicyCount'));
            const hasCreatePolicy = functions.some(f => f.startsWith('createPolicy'));
            
            if (!hasPolicyCount || !hasCreatePolicy) {
              console.warn('合约缺少关键函数');
              toast({
                title: '合约连接异常',
                description: '连接的合约可能不是有效的PolicyRegistry合约',
                status: 'warning',
                duration: 5000,
                isClosable: true,
              });
            }
          } else {
            console.error('合约接口不可用');
          }
          
          // 尝试获取策略数量
          try {
            const count = await contracts.policyRegistry.getPolicyCount();
            console.log('当前策略数量:', Number(count));
          } catch (err) {
            console.error('读取策略数量失败:', err);
          }
        }
      } catch (err) {
        console.error('验证合约连接失败:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // 初始化时验证合约
    if (isConnected) {
      verifyContractConnection();
    } else {
      setLoading(false);
    }
  }, [isConnected, contracts, toast]);

  const renderContent = () => {
    if (!isConnected) {
      return (
        <Flex justify="center" align="center" h="80vh" direction="column">
          <Heading mb={6} size="xl" color="primary.600">欢迎使用PBAC策略访问控制系统</Heading>
          <Text fontSize="lg" mb={8} textAlign="center">
            这是一个基于区块链的策略访问控制系统，<br />
            用于管理和评估资源访问策略。
          </Text>
          <ConnectWallet onConnect={() => {}} />
        </Flex>
      );
    }

    switch (activeSection) {
      case 'policies':
        return <PolicyList />;
      case 'create':
        return <PolicyForm />;
      case 'access':
        return <AccessControl />;
      default:
        return <PolicyList />;
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Spinner size="xl" color="primary.500" />
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Header isConnected={isConnected} account={account} onConnectClick={onOpen} />
      <Flex>
        {isConnected && (
          <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        )}
        <Box flex="1" p={5}>
          <VStack spacing={5} align="stretch">
            {renderContent()}
          </VStack>
        </Box>
      </Flex>
      <ConnectWallet isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}

// 主应用包装器
function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}

export default App; 