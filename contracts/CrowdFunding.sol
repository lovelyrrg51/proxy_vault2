// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./SafeERC20.sol";

/**
 * CrowdFunding Contract
 */
contract CrowdFunding is Ownable {
    using SafeERC20 for IERC20;

    /** ========================== CrowdFunding Variables ========================== */
    /// @notice CrowdFund Data Structure
    struct CrowdFundData {
        // CrowdFund ID
        uint256 crowdFundID;
        // CrowdFund Owner
        address crowdFundOwner;
        // Check CrowdFund Open/Close
        bool isCrowdFundOpen;
        // Funding Timeline, value of timestamp
        uint256 fundingTimeline;
        // Base ERC20 Token which would be use for CrowdFunding
        address baseToken;
        // Funding Goal Amount
        uint256 fundingGoalAmount;
        // Total Funded Amount
        uint256 totalFundedAmount;
        // User Funded Balance
        mapping(address => uint256) userFundedBalance;
    }

    /// @notice CrowdFund Total Count
    uint256 public crowdFundTotalCount;

    /// @notice CrowdFund List
    mapping(uint256 => CrowdFundData) public crowdFundList;

    /** ========================== CrowdFunding Modifiers ========================== */
    /**
     * @dev isCrowdFundOpen Modifier
     */
    modifier isCrowdFundOpen(uint256 _crowdFundID) {
        require(crowdFundList[_crowdFundID].isCrowdFundOpen, "CrowdFunding: CrowdFund is not open now.");
        require(crowdFundList[_crowdFundID].baseToken != address(0), "CrowdFunding: Base Token is not set.");
        require(crowdFundList[_crowdFundID].fundingTimeline >= block.timestamp, "CrowdFunding: Over timeline");
        require(crowdFundList[_crowdFundID].fundingGoalAmount > 0, "CrowdFunding: Funding amount is not set.");
        _;
    }

    /**
     * @dev CrowdFund Owner Modifier
     */
    modifier onlyCrowdFundOwner(uint256 _crowdFundID) {
        require(crowdFundList[_crowdFundID].crowdFundOwner == msg.sender, "CrowdFunding Ownable: caller is not owner.");
        _;
    }

    /**
     * @dev Withdraw Modifier
     */
    modifier isWithdraw(uint256 _crowdFundID) {
        require(crowdFundList[_crowdFundID].isCrowdFundOpen, "CrowdFunding Withdraw: CrowdFund is not open now.");
        require(crowdFundList[_crowdFundID].fundingTimeline < block.timestamp, "CrowdFunding Withdraw: Crowd Funding is still on progress.");
        require(crowdFundList[_crowdFundID].userFundedBalance[msg.sender] > 0, "CrowdFunding Withdraw: Funded amount should be more than zero.");
        require(crowdFundList[_crowdFundID].totalFundedAmount < crowdFundList[_crowdFundID].fundingGoalAmount, "CrowdFunding Withdraw: Total funded amount should be less than goal amount.");
        _;
    }

    /** ========================== CrowdFunding Events ========================== */
    // Deposit Event
    event DepositEvent(address indexed userAddress, uint256 crowdFundID, uint256 fundAmount, uint256 blockNumber, uint256 timestmap);
    // Withdraw Event
    event WithdrawEvent(address indexed userAddress, uint256 crowdFundID, uint256 refundAmount, uint256 blockNumber, uint256 timestmap);

    /** ========================== CrowdFunding Owner Functions ========================== */
    /**
     * @dev Create new CrowdFunding
     * @param _fundingTimeline: New CrowdFund Timeline
     * @param _baseToken: New CrowdFund Base Token
     * @param _fundingGoalAmount: New CrowdFund Goal Amount
     */
    function createNewCrowdFunding(
        uint256 _fundingTimeline,
        address _baseToken,
        uint256 _fundingGoalAmount
    ) external {
        // Check Funding Timeline
        require(_fundingTimeline > block.timestamp, "CrowdFunding New: Funding timeline should be bigger than current timestamp.");
        // Check Base Token
        require(_baseToken != address(0), "CrowdFunding New: Base Token should not zero address.");
        // Check Funding Goal Amount
        require(_fundingGoalAmount > 0, "CrowdFunding New: Funding goal amount should not be zero.");

        // Update new CrowdFund ID
        uint256 newCrowdFundID = crowdFundTotalCount + 1;

        // Create new CrowdFunding
        crowdFundList[newCrowdFundID].crowdFundID = newCrowdFundID;
        crowdFundList[newCrowdFundID].crowdFundOwner = msg.sender;
        crowdFundList[newCrowdFundID].isCrowdFundOpen = true;
        crowdFundList[newCrowdFundID].fundingTimeline = _fundingTimeline;
        crowdFundList[newCrowdFundID].baseToken = _baseToken;
        crowdFundList[newCrowdFundID].fundingGoalAmount = _fundingGoalAmount;
        crowdFundList[newCrowdFundID].totalFundedAmount = 0;

        // Update CrowdFund Total Count
        crowdFundTotalCount = crowdFundTotalCount + 1;
    }

    /**
     * @dev Update Open/Close CrowdFund
     * @param _crowdFundID: // CrowdFund ID
     * @param _isCrowdFundOpen: CrowdFund Open/Close Flag
     */
    function updateCrowdFundIsOpen(uint256 _crowdFundID, bool _isCrowdFundOpen) external onlyCrowdFundOwner(_crowdFundID) {
        crowdFundList[_crowdFundID].isCrowdFundOpen = _isCrowdFundOpen;
    }

    /**
     * @dev Update CrowdFund Base Token
     * @param _crowdFundID: // CrowdFund ID
     * @param _baseToken: CrowdFund Base Token
     */
    function updateCrowdFundBaseToken(uint256 _crowdFundID, address _baseToken) external onlyCrowdFundOwner(_crowdFundID) {
        crowdFundList[_crowdFundID].baseToken = _baseToken;
    }

    /**
     * @dev Update CrowdFund Goal Amount
     * @param _crowdFundID: // CrowdFund ID
     * @param _fundingGoalAmount: // Funding Goal Amount
     */
    function updateCrowdFundGoalAmount(uint256 _crowdFundID, uint256 _fundingGoalAmount) external onlyCrowdFundOwner(_crowdFundID) {
        crowdFundList[_crowdFundID].fundingGoalAmount = _fundingGoalAmount;
    }

    /** ========================== CrowdFunding User Functions ========================== */
    /**
     * @dev Return User Fund of CrowdFund
     * @param crowdFundID: // CrowdFund ID
     * @param userAddress: // User Address
     */
    function getUserCrowdFund(uint256 crowdFundID, address userAddress) public view returns (uint256) {
        return crowdFundList[crowdFundID].userFundedBalance[userAddress];
    }

    /**
     * @dev Deposit Fund to CrowdFunding Contract with CrowdFundID, Should approve deposit amount of base token before this.
     * @param crowdFundID: // CrowdFund ID
     * @param depositAmount: // User Deposit Amount
     */
    function depositFund(uint256 crowdFundID, uint256 depositAmount) external isCrowdFundOpen(crowdFundID) {
        // Get User Address
        address userAddress = msg.sender;
        // Get Base Token
        address baseToken = crowdFundList[crowdFundID].baseToken;

        // Safe TransferFrom User Address to CrowdFunding
        IERC20(baseToken).safeTransferFrom(userAddress, address(this), depositAmount);

        // Update Deposit Amount to CrowdFund
        crowdFundList[crowdFundID].userFundedBalance[userAddress] += depositAmount;
        // Update Total Funded Amount
        crowdFundList[crowdFundID].totalFundedAmount += depositAmount;

        // Emit the Event
        emit DepositEvent(userAddress, crowdFundID, depositAmount, block.number, block.timestamp);
    }

    /**
     * @dev Withdraw Base Token From CrowdFunding Contract.
     * @param crowdFundID: // CrowdFund ID
     */
    function withdrawFund(uint256 crowdFundID) external isWithdraw(crowdFundID) {
        // Get User Address
        address userAddress = msg.sender;
        // Get Base Token
        address baseToken = crowdFundList[crowdFundID].baseToken;

        // Get Current Funded Amount from CrowdFund
        uint256 withdrawFundAmount = crowdFundList[crowdFundID].userFundedBalance[userAddress];

        // Update Funded Amount
        crowdFundList[crowdFundID].userFundedBalance[userAddress] = 0;
        // Update Funded Total Amount
        crowdFundList[crowdFundID].totalFundedAmount -= withdrawFundAmount;

        // Safe Transfer to User Address
        IERC20(baseToken).safeTransfer(userAddress, withdrawFundAmount);

        // Emit the Event
        emit WithdrawEvent(userAddress, crowdFundID, withdrawFundAmount, block.number, block.timestamp);
    }
}