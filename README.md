# Proxy Vault Contract

This is proxy vault contract repository.
## 1. Proxy Vault Contracts
### 1) Proxy Contract
This is proxy of vault contract so that we could update vault at any time if needed. <br>
`- Major Features`
```
* Set Implemention - Update Vault contract address on Proxy
* Transfer Ownership - Transfer Ownership of Proxy contract
```
### 2) Vault Contract
This is vault contract which users could deposit specified erc-20 token and withdraw(re-fund) if it's not bigger than goal amount. <br>
`- Major Features`
```
* updateDepositStatus - Update Deposit Status Function, only Owner call it.
* updateDepositGoalAmount - Update Deposit Goal Amount Function, only Owner call it.
* updateBaseTokenAddress - Update Base Token Address, only Owner call it.
* checkUserDepositAmount - Check user deposit amount is bigger than goal amount.
* deposit - Deposit Base Token to Vault Contract, Should approve deposit amount of base token before this.
* withdraw - Withdraw Base Token From Vault Contract.
```

## 2. How to install/build/test Vault Contract
### 1) How to install
```
npm install
```
### 2) How to build
```
npm run build
```
### 3) How to test
```
npm run test
```
### 4) How to deploy
```
npm run deploy --network ${network}
```
### 5) How to verify
```
npx hardhat verify --network ${network} ${Proxy Contract Address}
npx hardhat verify --network ${network} ${Vault Contract Address}
```

## 3. Deployed Contract on Polygon Mumbai Testnet
### 1) Proxy Contract
```
https://mumbai.polygonscan.com/address/0x604Ce94599c0e400D192F109fbE8F4D17cAc0973#code
```

### 2) Vault Contract
```
https://mumbai.polygonscan.com/address/0xE97FAD02933e10ec47a97701E0fafDE7AcEE2A46#code
```