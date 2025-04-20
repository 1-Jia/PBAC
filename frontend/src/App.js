import React, { useState, useEffect } from 'react';
import { Box, Flex, VStack, Heading, Text, useDisclosure, Spinner } from '@chakra-ui/react';
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
  const { isConnected, account } = useWeb3();
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    // 检查连接状态后设置loading为false
    setLoading(false);
  }, []);

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