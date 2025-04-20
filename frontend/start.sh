#!/bin/bash
echo "正在启动PBAC系统前端..."
cd "$(dirname "$0")"
npm install || echo "安装依赖失败，可能是因为已经安装过了。继续启动..."
npm start 