import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// 导入合约ABI
import PolicyRegistryABI from '../utils/abis/PolicyRegistry.json';
import FlexibleSemanticAnalyzerABI from '../utils/abis/FlexibleSemanticAnalyzer.json';
import AccessControlABI from '../utils/abis/AccessControl.json';
import { safeContractCall } from '../utils/helpers';

// 创建上下文
const Web3Context = createContext();

// 合约地址（根据部署情况修改）
const CONTRACT_ADDRESSES = {
  // 使用本地hardhat节点上的新部署地址
  policyRegistry: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  semanticAnalyzer: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  accessControl: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'
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
        // 使用window.ethereum作为provider
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
        } else {
          console.log('已连接到本地网络');
          setNetworkError(null);

          // 获取当前选中的账户
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          console.log('当前账户:', accounts);
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
          }

          // 监听账户变化
          const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
              console.log('账户已变更:', accounts[0]);
              setAccount(accounts[0]);
              setIsConnected(true);
            } else {
              console.log('用户已断开连接');
              setAccount('');
              setIsConnected(false);
            }
          };

          // 监听网络变化
          const handleChainChanged = (chainId) => {
            console.log('网络已变更:', chainId);
            window.location.reload();
          };

          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', handleChainChanged);

          return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
          };
        }
      } else {
        console.warn('未检测到MetaMask或其他以太坊钱包');
        setNetworkError('请安装MetaMask以使用此应用');
      }
    } catch (error) {
      console.error('初始化Web3失败:', error);
      setNetworkError('连接到以太坊网络时出错: ' + error.message);
    }
  };

  useEffect(() => {
    const initializeContracts = async () => {
      if (provider && isConnected) {
        try {
          console.log('开始初始化合约...');
          console.log('Provider:', provider);
          console.log('合约地址:', CONTRACT_ADDRESSES);
          
          try {
            // 检查网络连接状态
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
          
          try {
            // 初始化合约实例 - 使用provider用于读取操作
            const policyRegistryContractRead = new ethers.Contract(
              CONTRACT_ADDRESSES.policyRegistry,
              PolicyRegistryABI.abi,
              provider
            );
            
            const semanticAnalyzerContractRead = new ethers.Contract(
              CONTRACT_ADDRESSES.semanticAnalyzer,
              FlexibleSemanticAnalyzerABI.abi,
              provider
            );
            
            const accessControlContractRead = new ethers.Contract(
              CONTRACT_ADDRESSES.accessControl,
              AccessControlABI.abi,
              provider
            );
            
            // 如果有signer，则创建可写的合约实例
            let policyRegistryContract = policyRegistryContractRead;
            let semanticAnalyzerContract = semanticAnalyzerContractRead;
            let accessControlContract = accessControlContractRead;
            
            if (signerInstance) {
              console.log('使用signer连接合约');
              try {
                policyRegistryContract = policyRegistryContractRead.connect(signerInstance);
                semanticAnalyzerContract = semanticAnalyzerContractRead.connect(signerInstance);
                accessControlContract = accessControlContractRead.connect(signerInstance);
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
            
            // 测试连接
            try {
              const policyCount = await safeContractCall(policyRegistryContract, 'getPolicyCount');
              console.log('连接成功！策略数量:', policyCount);
            } catch (testError) {
              console.error('合约测试查询失败:', testError);
              console.log('尝试获取策略数量时出错，请检查网络连接和合约部署状态');
            }
          } catch (contractError) {
            console.error('创建合约实例时出错:', contractError);
            throw contractError;
          }
        } catch (error) {
          console.error('合约初始化错误:', error);
          setNetworkError('初始化合约时出错。请确保您连接到正确的网络。');
        }
      }
    };

    if (provider) {
      initializeContracts();
    }
  }, [provider, isConnected]);

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