import React, { useState } from 'react';
import { 
  Button, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalCloseButton,
  VStack,
  Text,
  Icon,
  Box,
  Heading,
  useToast,
  Flex,
  Spinner
} from '@chakra-ui/react';
import { FiAlertTriangle } from 'react-icons/fi';
import { useWeb3 } from '../contexts/Web3Context';

function ConnectWallet({ isOpen, onClose }) {
  const { connectWallet } = useWeb3();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // 检查是否有window.ethereum (MetaMask)
      if (!window.ethereum) {
        throw new Error('请安装MetaMask插件来连接钱包');
      }

      // 通过上下文连接钱包
      const { account } = await connectWallet();
      
      toast({
        title: '钱包连接成功',
        description: `已连接到地址: ${account.slice(0, 6)}...${account.slice(-4)}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });

      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('连接钱包失败:', err);
      setError(err.message || '连接钱包失败，请稍后再试');
      
      toast({
        title: '连接失败',
        description: err.message || '连接钱包失败，请稍后再试',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // 当作为独立组件使用时的样式
  if (!isOpen && !onClose) {
    return (
      <Button
        size="lg"
        colorScheme="blue"
        onClick={handleConnectWallet}
        isLoading={isConnecting}
        loadingText="连接中..."
        shadow="md"
        _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
        transition="all 0.2s"
      >
        连接钱包
      </Button>
    );
  }

  // 作为模态框使用时的样式
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent borderRadius="xl" p={2}>
        <ModalHeader fontSize="xl" fontWeight="bold" textAlign="center">连接钱包</ModalHeader>
        <ModalCloseButton size="lg" />
        <ModalBody pb={6}>
          <VStack spacing={6}>
            <Box textAlign="center" p={4}>
              <Heading size="md" mb={4} color="gray.700">
                连接您的钱包以访问PBAC系统
              </Heading>
              <Text color="gray.500" fontSize="sm">
                连接您的以太坊钱包以管理访问策略和控制权限
              </Text>
            </Box>

            {error && (
              <Box 
                w="full" 
                p={4} 
                bg="red.50" 
                color="red.600" 
                borderRadius="md"
              >
                <Flex align="center">
                  <Icon as={FiAlertTriangle} mr={2} />
                  <Text fontSize="sm" fontWeight="medium">{error}</Text>
                </Flex>
              </Box>
            )}

            <Button
              w="full"
              size="lg"
              colorScheme="blue"
              onClick={handleConnectWallet}
              isLoading={isConnecting}
              loadingText="连接中..."
              leftIcon={isConnecting ? <Spinner size="sm" /> : null}
            >
              连接MetaMask
            </Button>
            <Text mt={2} color="gray.500" fontSize="sm" textAlign="center">
              Codeby贾煜航
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ConnectWallet; 