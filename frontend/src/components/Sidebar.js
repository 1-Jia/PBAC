import React from 'react';
import { 
  Box, 
  VStack, 
  Flex, 
  Text, 
  Icon, 
  useColorModeValue 
} from '@chakra-ui/react';
import { 
  FiList, 
  FiPlus, 
  FiLock, 
  FiShield
} from 'react-icons/fi';

const menuItems = [
  { id: 'policies', label: '策略列表', icon: FiList },
  { id: 'create', label: '创建策略', icon: FiPlus },
  { id: 'access', label: '访问控制', icon: FiLock }
];

function Sidebar({ activeSection, setActiveSection }) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box 
      minW="240px" 
      borderRight="1px" 
      borderColor={borderColor}
      bg={bgColor}
      h="calc(100vh - 72px)"
      p={4}
    >
      <Flex align="center" mb={8} px={2}>
        <Icon as={FiShield} boxSize={5} color="primary.500" mr={2} />
        <Text fontWeight="bold" fontSize="lg" color="primary.700">
          策略管理
        </Text>
      </Flex>
      
      <VStack spacing={1} align="stretch">
        {menuItems.map((item) => (
          <Box
            key={item.id}
            p={3}
            borderRadius="md"
            cursor="pointer"
            bg={activeSection === item.id ? 'primary.50' : 'transparent'}
            color={activeSection === item.id ? 'primary.700' : 'gray.600'}
            _hover={{ bg: activeSection === item.id ? 'primary.100' : 'gray.100' }}
            onClick={() => setActiveSection(item.id)}
            transition="all 0.2s"
          >
            <Flex align="center">
              <Icon as={item.icon} boxSize={5} mr={3} />
              <Text fontWeight={activeSection === item.id ? 'semibold' : 'medium'}>
                {item.label}
              </Text>
            </Flex>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}

export default Sidebar; 