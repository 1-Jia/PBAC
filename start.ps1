Write-Host "Starting PBAC System..." -ForegroundColor Green

# Start Hardhat node
Write-Host "Starting Hardhat node..." -ForegroundColor Green
Start-Process powershell -ArgumentList "npx hardhat node" -WindowStyle Normal

# Wait for node to start
Write-Host "Waiting for node to start..." -ForegroundColor Green
Start-Sleep -Seconds 5

# Compile contracts
Write-Host "Compiling contracts..." -ForegroundColor Green
npx hardhat compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Contract compilation failed" -ForegroundColor Red
    exit 1
}

# Deploy contracts
Write-Host "Deploying contracts..." -ForegroundColor Green
npx hardhat run scripts/deploy.js --network localhost
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Contract deployment failed" -ForegroundColor Red
    exit 1
}

# Start frontend
Write-Host "Starting frontend application..." -ForegroundColor Green
Set-Location frontend
npm start 