#!/bin/bash

echo "启动PBAC系统..."

# 检查是否安装了必要的工具
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请先安装Node.js"
    exit 1
fi

# 启动本地Hardhat节点（在后台）
echo "启动本地Hardhat节点..."
npx hardhat node &
HARDHAT_PID=$!

# 等待节点启动
sleep 5

# 编译并部署合约
echo "编译并部署合约..."
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost

# 启动前端应用
echo "启动前端应用..."
cd frontend
npm start

# 清理进程
trap "kill $HARDHAT_PID" EXIT 