import React from 'react';
import { 
  Box, 
  Flex, 
  Heading, 
  Button, 
  Text, 
  HStack, 
  useColorModeValue,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi';
import { truncateAddress } from '../utils/helpers';
import { useWeb3 } from '../contexts/Web3Context';

function Header({ isConnected, account, onConnectClick }) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { disconnectWallet } = useWeb3();
  const toast = useToast();

  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: "已断开连接",
      description: "您的钱包已成功断开连接",
      status: "info",
      duration: 3000,
      isClosable: true,
      position: "top-right"
    });
  };

  return (
    <Box 
      as="header" 
      py={4} 
      px={6} 
      bg={bgColor} 
      borderBottom="1px" 
      borderColor={borderColor}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" maxW="container.xl" mx="auto">
        <HStack spacing={3}>
          <Heading 
            size="md" 
            color="primary.600" 
            fontWeight="bold"
          >
            PBAC策略访问控制系统
          </Heading>
          <Badge colorScheme="blue" py={1} px={2} borderRadius="md">
            策略访问控制
          </Badge>
          <Text color="gray.500" fontSize="sm">
            Codeby贾煜航
          </Text>
        </HStack>

        {isConnected ? (
          <HStack spacing={4}>
            <Menu>
              <MenuButton 
                as={Button} 
                rightIcon={<FiChevronDown />}
                py={2} 
                px={4} 
                borderRadius="full" 
                bg="primary.50" 
                color="primary.700"
                _hover={{ bg: "primary.100" }}
              >
                <Text fontWeight="medium">
                  {truncateAddress(account)}
                </Text>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiUser />} command="账户管理">
                  {truncateAddress(account)}
                </MenuItem>
                <MenuItem 
                  icon={<FiLogOut />} 
                  color="red.500" 
                  onClick={handleDisconnect}
                >
                  断开连接
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        ) : (
          <Button 
            colorScheme="blue" 
            onClick={onConnectClick}
            size="md"
            fontWeight="medium"
          >
            连接钱包
          </Button>
        )}
      </Flex>
    </Box>
  );
}

export default Header; 