// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./SafeERC20.sol";

/**
 * Vault Contract
 */
contract Vault is Ownable {
    using SafeERC20 for IERC20;

    /** ========================== Vault Variables ========================== */
    // Is Deposit, only Owner set it.
    bool public isDeposit;

    // Base ERC20 Token which would be use for vault, only Owner set it.
    address public baseToken;

    // Funding Goal Amount
    uint256 public depositGoalAmount;

    // User Deposit Balance Mapping Variable
    mapping(address => uint256) public userDepositBalance;

    /** ========================== Vault Modifiers ========================== */
    /**
     * @dev isDepositOpen Modifier
     */
    modifier isDepositOpen {
        require(isDeposit, "Vault: Deposit Token is disable now.");
        _;
    }

    /**
     * @dev Check Base Token Modifier
     */
    modifier isBaseTokenSet {
        require(baseToken != address(0), "Vault: Base Token is not set yet.");
        _;
    }

    /**
     * @dev Withdraw Modifier
     */
    modifier isWithdraw {
        require(userDepositBalance[msg.sender] > 0, "Vault Withdraw: Deposited amount should be more than zero.");
        require(!checkUserDepositAmount(msg.sender), "Vault Withdraw: Deposited amount should be less than goal amount.");
        _;
    }

    /** ========================== Vault Events ========================== */
    // Deposit Event
    event DepositEvent(address indexed userAddress, uint256 depositAmount, uint256 blockNumber, uint256 timestmap);
    // Withdraw Event
    event WithdrawEvent(address indexed userAddress, uint256 withdrawAmount, uint256 blockNumber, uint256 timestmap);

    /** ========================== Vault Owner(Admin) Functions ========================== */
    /**
     * @dev Update Deposit Status Function, only Owner call it.
     * @param _isDeposit: true/false: enable/disable deposit
     */
    function updateDepositStatus(bool _isDeposit) external onlyOwner {
        // Update isDeposit Status
        isDeposit = _isDeposit;
    }

    /**
     * @dev Update Deposit Goal Amount Function, only Owner call it.
     * @param _depositGoalAmount: New Deposit Goal Amount, It should be multiplied by decimal.
     */
    function updateDepositGoalAmount(uint256 _depositGoalAmount) external onlyOwner {
        // Update Deposit Goal Amount
        depositGoalAmount = _depositGoalAmount;
    }

    /**
     * @dev Update Base Token Address, only Owner call it.
     * @param _baseTokenAddress: New Base Token Address
     */
    function updateBaseTokenAddress(address _baseTokenAddress) external onlyOwner {
        // Update Base Token Address
        baseToken = _baseTokenAddress;
    }

    /** ========================== Vault Get Functions ========================== */
    /**
     * @dev Check user deposit amount is bigger than goal amount.
     * @param userAddress: User Deposit Address
     */
    function checkUserDepositAmount(address userAddress) public view returns (bool) {
        return userDepositBalance[userAddress] >= depositGoalAmount ? true: false;
    }

    /** ========================== Vault Functions ========================== */
    /**
     * @dev Deposit Base Token to Vault Contract, Should approve deposit amount of base token before this.
     * @param depositAmount: User Deposit Amount
     */
    function deposit(uint256 depositAmount) external isDepositOpen isBaseTokenSet {
        // Get User Address
        address userAddress = msg.sender;

        // Safe TransferFrom User Address to Vault
        IERC20(baseToken).safeTransferFrom(userAddress, address(this), depositAmount);

        // Update Deposit Amount
        userDepositBalance[userAddress] += depositAmount;

        // Emit the Event
        emit DepositEvent(userAddress, depositAmount, block.number, block.timestamp);
    }  

    /**
     * @dev Withdraw Base Token From Vault Contract.
     */
    function withdraw() external isWithdraw {
        // Get User Address
        address userAddress = msg.sender;
        // Get Current Deposit Amount
        uint256 withdrawAmount = userDepositBalance[userAddress];

        // Update Deposit Amount
        userDepositBalance[userAddress] = 0;

        // Safe Transfer to User Address
        IERC20(baseToken).safeTransfer(userAddress, withdrawAmount);

        // Emit the Event
        emit WithdrawEvent(userAddress, withdrawAmount, block.number, block.timestamp);
    }
}