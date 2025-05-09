import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@chakra-ui/react';

// 导入合约ABI
import PolicyRegistryABI from '../utils/abis/PolicyRegistry.json';
import FlexibleSemanticAnalyzerABI from '../utils/abis/FlexibleSemanticAnalyzer.json';
import AccessControlABI from '../utils/abis/AccessControl.json';
import { safeContractCall } from '../utils/helpers';

// 创建上下文
const Web3Context = createContext();

// 合约地址（根据部署情况修改）
const CONTRACT_ADDRESSES = {
  policyRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  semanticAnalyzer: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  accessControl: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

export function Web3Provider({ children, value }) {
  const [provider, setProvider] = useState(value?.provider || null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(value?.account || '');
  const [isConnected, setIsConnected] = useState(value?.isConnected || false);
  const [contracts, setContracts] = useState({
    policyRegistry: null,
    semanticAnalyzer: null,
    accessControl: null
  });
  const [networkError, setNetworkError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (value?.provider) {
      setProvider(value.provider);
    }
    if (value?.account) {
      setAccount(value.account);
    }
    if (value?.isConnected !== undefined) {
      setIsConnected(value.isConnected);
    }
  }, [value]);

  useEffect(() => {
    const setupSigner = async () => {
      if (provider && isConnected) {
        try {
          const signerInstance = await provider.getSigner();
          setSigner(signerInstance);
        } catch (error) {
          console.error('Error setting up signer:', error);
        }
      }
    };

    if (provider && isConnected) {
      setupSigner();
    }
  }, [provider, isConnected]);

  const initializeWeb3 = async () => {
    try {
      // 检查是否有window.ethereum对象
      if (window.ethereum) {
        console.log('检测到MetaMask或其他以太坊钱包');
        
        // 强制请求用户授权 - 这会触发MetaMask弹窗
        console.log('请求MetaMask授权...');
        
        // 设置一个超时计时器来检测MetaMask弹窗是否出现
        const authTimeout = setTimeout(() => {
          console.warn('MetaMask授权请求可能没有弹出，请检查MetaMask扩展是否锁定或最小化');
          toast({
            title: 'MetaMask提示',
            description: '请检查MetaMask扩展是否已弹出授权请求，如果没有，请点击浏览器工具栏中的MetaMask图标',
            status: 'warning',
            duration: 10000,
            isClosable: true,
            position: 'top',
          });
        }, 3000);
        
        try {
          // 先检查钱包当前状态
          const isUnlocked = await window.ethereum._metamask?.isUnlocked?.() || false;
          console.log('MetaMask是否已解锁:', isUnlocked);
          
          if (!isUnlocked) {
            console.warn('MetaMask可能已锁定，用户需要先解锁钱包');
            toast({
              title: 'MetaMask已锁定',
              description: '请先解锁您的MetaMask钱包',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        } catch (checkError) {
          console.log('无法检查MetaMask锁定状态:', checkError);
        }
        
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        }).catch(error => {
          clearTimeout(authTimeout);
          console.error('MetaMask授权请求被拒绝:', error);
          throw new Error('MetaMask授权请求被拒绝，请允许连接');
        });
        
        clearTimeout(authTimeout);
        
        if (!accounts || accounts.length === 0) {
          console.error('未能获取账户');
          throw new Error('未能获取MetaMask账户，请确保授权后重试');
        }
        
        console.log('获取到账户:', accounts[0]);
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // 使用window.ethereum作为provider创建ethers provider
        console.log('创建ethers provider...');
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);

        // 检查连接的网络
        const network = await web3Provider.getNetwork();
        console.log('当前连接的网络:', network);

        // 检查是否为本地网络(localhost或Hardhat网络)
        const isLocalNetwork = 
          network.chainId === 1337n || // Hardhat网络chainId
          network.chainId === 31337n || // Hardhat网络另一个可能的chainId
          network.name.toLowerCase() === 'localhost' || 
          network.name.toLowerCase() === 'unknown';

        if (!isLocalNetwork) {
          console.warn('当前不是连接到本地开发网络，请切换到localhost');
          setNetworkError('请将MetaMask连接到本地开发网络 (localhost:8545)');
          
          // 尝试切换到正确的网络
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
            console.log('已切换到本地网络');
          } catch (switchError) {
            // 如果切换失败，可能需要添加网络
            if (switchError.code === 4902) {
              try {
                toast({
                  title: '添加网络',
                  description: '正在尝试添加本地网络，请在MetaMask中确认',
                  status: 'info',
                  duration: 5000,
                  isClosable: true,
                });
                
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x539', // 十六进制的1337
                      chainName: 'Localhost 8545',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                      },
                      rpcUrls: ['http://localhost:8545']
                    }
                  ]
                });
                
                // 尝试再次切换网络
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x539' }],
                });
              } catch (addError) {
                console.error('添加网络失败:', addError);
                throw new Error('无法切换到本地网络，请手动在MetaMask中添加并切换');
              }
            } else {
              console.error('切换网络失败:', switchError);
              throw new Error('切换到本地网络失败，请手动在MetaMask中切换');
            }
          }
        } else {
          console.log('已连接到本地网络');
          setNetworkError(null);
        }

        // 明确获取签名者
        try {
          console.log('获取签名者...');
          const signerInstance = await web3Provider.getSigner();
          console.log('签名者地址:', await signerInstance.getAddress());
          setSigner(signerInstance);
          
          // 初始化合约
          await initializeContracts();
          
        } catch (signerError) {
          console.error('获取签名者失败:', signerError);
          throw new Error('无法获取签名者，请确保MetaMask已解锁并已授权');
        }

        // 监听账户变化
        const handleAccountsChanged = (accounts) => {
          if (accounts.length > 0) {
            console.log('账户已变更:', accounts[0]);
            setAccount(accounts[0]);
            setIsConnected(true);
            
            // 重新初始化签名者和合约
            (async () => {
              try {
                const newSigner = await web3Provider.getSigner();
                setSigner(newSigner);
                await initializeContracts();
              } catch (error) {
                console.error('账户变更后重新初始化失败:', error);
              }
            })();
          } else {
            console.log('用户已断开连接');
            setAccount('');
            setIsConnected(false);
            setSigner(null);
          }
        };

        // 监听网络变化
        const handleChainChanged = (_chainId) => {
          console.log('网络已变更:', _chainId);
          window.location.reload();
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // 返回连接成功的账户信息
        return { account: accounts[0] };
      } else {
        console.warn('未检测到MetaMask或其他以太坊钱包');
        setNetworkError('请安装MetaMask以使用此应用');
        throw new Error('未检测到MetaMask或其他以太坊钱包');
      }
    } catch (error) {
      console.error('初始化Web3失败:', error);
      setNetworkError('连接到以太坊网络时出错: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    const initContractsEffect = async () => {
      if (provider && isConnected) {
        try {
          await initializeContracts();
        } catch (error) {
          console.error('合约初始化错误:', error);
          setNetworkError('初始化合约时出错。请确保您连接到正确的网络。');
        }
      }
    };

    if (provider) {
      initContractsEffect();
    }
  }, [provider, isConnected]);

  // 初始化合约实例的函数
  const initializeContracts = async () => {
    try {
      // 确保provider已经初始化
      if (!provider) {
        console.warn('Provider未定义，等待provider初始化...');
        return; // 不抛出错误，而是静默返回
      }

      console.log('开始初始化合约...');
      console.log('Provider:', provider);
      console.log('合约地址:', CONTRACT_ADDRESSES);
      
      // 检查网络连接状态
      try {
        const network = await provider.getNetwork();
        console.log('当前网络:', network.name, '链ID:', network.chainId.toString());
        
        // 确保合约地址有效
        Object.entries(CONTRACT_ADDRESSES).forEach(([name, address]) => {
          if (!address || !ethers.isAddress(address)) {
            throw new Error(`无效的${name}合约地址: ${address}`);
          }
        });
      } catch (networkError) {
        console.error('网络检查失败:', networkError);
        // 继续执行，不中断流程
      }
      
      // 尝试获取合约字节码并验证合约是否已部署
      try {
        const code = await provider.getCode(CONTRACT_ADDRESSES.policyRegistry);
        console.log('PolicyRegistry合约字节码长度:', code.length);
        if (code === '0x' || code.length <= 2) {
          console.error('警告: PolicyRegistry合约可能未部署或地址错误!');
          toast({
            title: '合约未部署',
            description: 'PolicyRegistry合约可能未正确部署，请确保本地区块链节点正在运行并且合约已部署',
            status: 'error',
            duration: 8000,
            isClosable: true,
          });
        }
      } catch (codeError) {
        console.error('获取合约字节码失败:', codeError);
      }
      
      // 确保我们有有效的provider和signer
      let signerInstance;
      try {
        signerInstance = provider.getSigner ? await provider.getSigner() : null;
        console.log('Signer:', signerInstance);
      } catch (signerError) {
        console.error('获取签名者失败:', signerError);
        // 继续使用只读模式
      }
      
      // 读取合约ABI部分 - 确保我们获取到正确的ABI结构
      console.log('PolicyRegistry ABI样本:', PolicyRegistryABI.abi.slice(0, 2));
      
      // 初始化合约实例 - 使用provider用于读取操作
      console.log('开始初始化合约实例...');
      console.log('PolicyRegistry地址:', CONTRACT_ADDRESSES.policyRegistry);
      console.log('ABI是否存在:', PolicyRegistryABI && PolicyRegistryABI.abi);
      
      // 检查ABI的有效性
      if (!PolicyRegistryABI || !PolicyRegistryABI.abi || !Array.isArray(PolicyRegistryABI.abi)) {
        console.error('PolicyRegistry ABI无效:', PolicyRegistryABI);
        throw new Error('合约ABI无效或格式不正确');
      }
      
      // 创建合约实例 - ethers v6版本适配
      let policyRegistryContract, semanticAnalyzerContract, accessControlContract;
      
      try {
        // 创建只读合约实例
        policyRegistryContract = new ethers.Contract(
          CONTRACT_ADDRESSES.policyRegistry,
          PolicyRegistryABI.abi,
          provider
        );
        
        semanticAnalyzerContract = new ethers.Contract(
          CONTRACT_ADDRESSES.semanticAnalyzer,
          FlexibleSemanticAnalyzerABI.abi,
          provider
        );
        
        accessControlContract = new ethers.Contract(
          CONTRACT_ADDRESSES.accessControl,
          AccessControlABI.abi,
          provider
        );
        
        // 验证合约实例是否创建成功
        if (!policyRegistryContract.interface) {
          console.error('合约接口不存在');
          throw new Error('合约实例创建失败：接口不存在');
        }
        
        // 不检查functions属性，因为ethers v6可能不使用此属性
        console.log('PolicyRegistry合约实例创建成功');
        
        // 如果有signer，则创建可写的合约实例
        if (signerInstance) {
          console.log('使用signer连接合约');
          try {
            // ethers v6连接signer
            policyRegistryContract = policyRegistryContract.connect(signerInstance);
            semanticAnalyzerContract = semanticAnalyzerContract.connect(signerInstance);
            accessControlContract = accessControlContract.connect(signerInstance);
          } catch (connectError) {
            console.error('连接signer到合约失败:', connectError);
            // 继续使用只读合约
          }
        }
        
        console.log('合约实例创建完成');
        
        // 更新合约实例
        setContracts({
          policyRegistry: policyRegistryContract,
          semanticAnalyzer: semanticAnalyzerContract,
          accessControl: accessControlContract
        });
        
        // 测试连接但不阻塞流程
        try {
          console.log('测试合约调用...');
          // 使用低级调用方式测试
          const data = policyRegistryContract.interface.encodeFunctionData('getPolicyCount', []);
          const result = await provider.call({
            to: CONTRACT_ADDRESSES.policyRegistry,
            data
          });
          
          if (result === '0x') {
            console.log('getPolicyCount返回空值，可能是新部署的合约');
          } else {
            try {
              const decodedResult = policyRegistryContract.interface.decodeFunctionResult('getPolicyCount', result);
              console.log('连接成功！策略数量:', decodedResult[0]);
            } catch (decodeError) {
              console.error('解码结果失败:', decodeError);
            }
          }
        } catch (testError) {
          console.log('测试连接时出错，但不影响合约初始化:', testError.message);
        }
        
      } catch (contractError) {
        console.error('创建合约实例出错:', contractError);
        throw new Error('合约实例化失败: ' + contractError.message);
      }
      
    } catch (error) {
      console.error('合约初始化错误:', error);
      throw error;
    }
  };

  // 断开钱包连接
  const disconnectWallet = () => {
    // 重置所有状态
    setProvider(null);
    setSigner(null);
    setAccount('');
    setIsConnected(false);
    setContracts({
      policyRegistry: null,
      semanticAnalyzer: null,
      accessControl: null
    });
    
    console.log('钱包已断开连接');
    
    // 注意：MetaMask不支持通过API直接断开连接，
    // 这只会清除应用中的连接状态，MetaMask仍然会保持连接
    // 用户需要手动在MetaMask中断开连接
    return true;
  };

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        isConnected,
        contracts,
        networkError,
        connectWallet: initializeWeb3,
        disconnectWallet
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}

export default Web3Context; 