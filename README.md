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