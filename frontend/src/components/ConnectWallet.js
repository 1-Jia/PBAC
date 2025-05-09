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
import { ethers } from 'ethers';

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

            <Button
              w="full"
              size="md"
              colorScheme="green"
              onClick={async () => {
                try {
                  // 检查MetaMask是否存在
                  if (!window.ethereum) {
                    throw new Error('未检测到MetaMask插件，请先安装MetaMask');
                  }
                  
                  // 检查MetaMask连接状态
                  const isConnected = window.ethereum.isConnected();
                  console.log('MetaMask连接状态:', isConnected ? '已连接' : '未连接');
                  
                  // 尝试检查是否已解锁
                  let isUnlocked = false;
                  try {
                    isUnlocked = await window.ethereum._metamask?.isUnlocked?.() || false;
                    console.log('MetaMask是否已解锁:', isUnlocked);
                  } catch (unlockError) {
                    console.log('无法检查MetaMask锁定状态:', unlockError);
                  }
                  
                  // 获取网络信息
                  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                  console.log('当前网络ID:', chainId);
                  
                  // 获取账户
                  console.log('正在请求账户访问权限...');
                  const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts',
                    params: [] 
                  });
                  console.log('账户列表:', accounts);
                  
                  // 验证hardhat节点是否运行
                  try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const blockNumber = await provider.getBlockNumber();
                    console.log('当前区块号:', blockNumber);
                    
                    // 尝试获取合约字节码验证部署
                    try {
                      const policyRegistry = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
                      const code = await provider.getCode(policyRegistry);
                      const isDeployed = code && code !== '0x' && code.length > 2;
                      console.log('PolicyRegistry合约字节码长度:', code.length);
                      console.log('合约是否已部署:', isDeployed);
                      
                      if (!isDeployed) {
                        toast({
                          title: 'MetaMask测试成功但合约未部署',
                          description: '您已成功连接到MetaMask，但PolicyRegistry合约似乎未部署',
                          status: 'warning',
                          duration: 8000,
                          isClosable: true,
                        });
                        return;
                      }
                    } catch (codeError) {
                      console.error('获取合约代码失败:', codeError);
                    }
                  } catch (nodeError) {
                    console.error('无法连接到hardhat节点:', nodeError);
                    toast({
                      title: 'Hardhat节点未运行',
                      description: '无法连接到本地区块链节点，请确保已启动hardhat节点',
                      status: 'error',
                      duration: 5000,
                      isClosable: true,
                    });
                    return;
                  }
                  
                  // 验证网络是否正确
                  const isLocalNetwork = chainId === '0x539' || chainId === '0x7a69';
                  if (!isLocalNetwork) {
                    // 尝试切换到本地网络
                    try {
                      await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x539' }], // 1337
                      });
                      console.log('已切换到本地网络');
                      
                      toast({
                        title: 'MetaMask测试成功',
                        description: '已切换到本地网络',
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                      });
                    } catch (switchError) {
                      console.error('网络切换失败:', switchError);
                      toast({
                        title: '网络切换失败',
                        description: '请手动切换到本地网络(localhost:8545)',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                      });
                    }
                  } else {
                    toast({
                      title: 'MetaMask测试成功',
                      description: `已获取账户: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
                      status: 'success',
                      duration: 5000,
                      isClosable: true,
                    });
                  }
                } catch (err) {
                  console.error('MetaMask测试失败:', err);
                  toast({
                    title: 'MetaMask测试失败',
                    description: err.message,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                  });
                }
              }}
            >
              测试MetaMask连接
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