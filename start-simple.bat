@echo off
chcp 65001

echo Starting Hardhat node...
start "Hardhat Node" cmd /k "npx hardhat node"

timeout /t 5 /nobreak >nul

echo Compiling contracts...
call npx hardhat compile

echo Deploying contracts...
call npx hardhat run scripts/deploy.js --network localhost

echo Starting frontend...
cd frontend
call npm start

pause 