const { assert, expect } = require("chai");
const { ethers, contract, artifacts } = require("hardhat");

const CrowdFunding = artifacts.require("CrowdFunding");
const BaseToken = artifacts.require("BaseToken");

contract("CrowdFunding Test", () => {
  beforeEach(async () => {
    const [owner, alice, bob] = await ethers.getSigners();

    this.owner = owner;
    this.alice = alice;
    this.bob = bob;

    // CrowdFunding Contract
    this.CrowdFundingInstance = await CrowdFunding.new();

    const crowdFunding = await ethers.getContractFactory("CrowdFunding");
    this.CrowdFunding = await crowdFunding.deploy();
    await this.CrowdFunding.deployed();

    // Proxy Contract
    const proxy = await ethers.getContractFactory("Proxy");
    this.Proxy = await proxy.deploy();
    await this.Proxy.deployed();

    // BaseToken Contract
    this.BaseTokenInstance = await BaseToken.new();
    const baseToken = await ethers.getContractFactory("BaseToken");
    this.BaseToken = await baseToken.deploy();
    await this.BaseToken.deployed();

    // Set Implementation
    await this.Proxy.connect(this.owner).setImplementation(
      this.CrowdFunding.address
    );

    // Get Updated Proxy from CrowdFunding Contract
    this.updatedProxy = new ethers.Contract(
      this.Proxy.address,
      this.CrowdFundingInstance.abi,
      this.owner
    );
  });

  describe("Test CrowdFunding - Initialize", async () => {
    it("Check Proxy Address", async () => {
      assert.equal(
        await this.Proxy.getImplementation(),
        this.CrowdFunding.address
      );
    });

    it("Check Initialized Variables", async () => {
      // Check CrowdFund Total Count
      assert.equal(await this.updatedProxy.crowdFundTotalCount(), 0);
    });
  });

  describe("Test CrowdFunding - New & Update CrowdFunding", async () => {
    it("Check New CrowdFunding", async () => {
      // Try to create new crowdfund with wrong funding timeline
      await expect(
        this.updatedProxy
          .connect(this.alice)
          .createNewCrowdFunding(
            Math.floor(Date.now() / 1000) - 1000,
            this.BaseToken.address,
            "5000000000000000000"
          )
      ).to.be.revertedWith(
        "CrowdFunding New: Funding timeline should be bigger than current timestamp."
      );

      // Try to create new crowdfund with wrong base token
      await expect(
        this.updatedProxy.connect(this.alice).createNewCrowdFunding(
          Math.floor(Date.now() / 1000) + 1000,
          "0x0000000000000000000000000000000000000000", // address(0)
          "5000000000000000000"
        )
      ).to.be.revertedWith(
        "CrowdFunding New: Base Token should not zero address."
      );

      // Try to create new crowdfund with wrong funding goal amount
      await expect(
        this.updatedProxy
          .connect(this.alice)
          .createNewCrowdFunding(
            Math.floor(Date.now() / 1000) + 1000,
            this.BaseToken.address,
            0
          )
      ).to.be.revertedWith(
        "CrowdFunding New: Funding goal amount should not be zero."
      );

      // Create New CrowdFund
      const goalTimeline = Math.floor(Date.now() / 1000) + 1000;
      await this.updatedProxy.connect(this.alice).createNewCrowdFunding(
        goalTimeline,
        this.BaseToken.address,
        "5000000000000000000" // 5 BST
      );

      // Check Total CrowdFund Count
      assert.equal(await this.updatedProxy.crowdFundTotalCount(), 1);
      // Check new CrowdFund
      const newCrowdFund = await this.updatedProxy.crowdFundList(1);
      assert.equal(newCrowdFund.crowdFundID, 1);
      assert.equal(newCrowdFund.crowdFundOwner, this.alice.address);
      assert.equal(newCrowdFund.isCrowdFundOpen, true);
      assert.equal(newCrowdFund.fundingTimeline, goalTimeline);
      assert.equal(newCrowdFund.baseToken, this.BaseToken.address);
      assert.equal(newCrowdFund.fundingGoalAmount, "5000000000000000000");
      assert.equal(newCrowdFund.totalFundedAmount, 0);
    });

    it("Check Update CrowdFunding", async () => {
      const goalTimeline = Math.floor(Date.now() / 1000) + 1000;

      // Create New CrowdFund
      await this.updatedProxy.connect(this.alice).createNewCrowdFunding(
        goalTimeline,
        this.BaseToken.address,
        "5000000000000000000" // 5 BST
      );

      // Try to update crowdfund with wrong owner
      await expect(
        this.updatedProxy.connect(this.bob).updateCrowdFundIsOpen(1, false)
      ).to.be.revertedWith("CrowdFunding Ownable: caller is not owner.");
      // Update Open/Close CrowdFund
      await this.updatedProxy
        .connect(this.alice)
        .updateCrowdFundIsOpen(1, false);
      assert.equal(
        (await this.updatedProxy.crowdFundList(1)).isCrowdFundOpen,
        false
      );

      // Try to update crowdfund with wrong owner
      const baseToken = await ethers.getContractFactory("BaseToken");
      const BaseToken = await baseToken.deploy();
      await BaseToken.deployed();

      await expect(
        this.updatedProxy
          .connect(this.bob)
          .updateCrowdFundBaseToken(1, BaseToken.address)
      ).to.be.revertedWith("CrowdFunding Ownable: caller is not owner.");
      // Update BaseToken of CrowdFund
      await this.updatedProxy
        .connect(this.alice)
        .updateCrowdFundBaseToken(1, BaseToken.address);
      assert.equal(
        (await this.updatedProxy.crowdFundList(1)).baseToken,
        BaseToken.address
      );

      // Try to update crowdfund with wrong owner
      await expect(
        this.updatedProxy
          .connect(this.bob)
          .updateCrowdFundGoalAmount(1, "3000000000000000000")
      ).to.be.revertedWith("CrowdFunding Ownable: caller is not owner.");
      // Update Open/Close CrowdFund
      await this.updatedProxy
        .connect(this.alice)
        .updateCrowdFundGoalAmount(1, "3000000000000000000");
      assert.equal(
        (await this.updatedProxy.crowdFundList(1)).fundingGoalAmount,
        "3000000000000000000"
      );
    });
  });

  describe("Test CrowdFund - Deposit Fund", async () => {
    beforeEach(async () => {
      this.goalTimeline = Math.floor(Date.now() / 1000) + 3600; // current_time + 1 hour

      // Create Two DepositFunds
      await this.updatedProxy.connect(this.alice).createNewCrowdFunding(
        this.goalTimeline,
        this.BaseToken.address,
        "5000000000000000000" // 5 BST
      );
      await this.updatedProxy.connect(this.bob).createNewCrowdFunding(
        this.goalTimeline,
        this.BaseToken.address,
        "10000000000000000000" // 10 BST
      );

      // Send Base Token, 10 Base Token to Alice's address
      await this.BaseToken.connect(this.owner).transfer(
        this.alice.address,
        "10000000000000000000" // 10 BST
      );
      // Send Base Token, 20 Base Token to Bob's address
      await this.BaseToken.connect(this.owner).transfer(
        this.bob.address,
        "20000000000000000000" // 20 BST
      );
    });

    it("Check Deposit - Wrong Case - CrowdFund not open", async () => {
      // Update CrowdFund
      await this.updatedProxy
        .connect(this.alice)
        .updateCrowdFundIsOpen(1, false);
      // Try to Deposit Fund
      await expect(
        this.updatedProxy.connect(this.bob).depositFund(1, "10000000000000000")
      ).to.be.revertedWith("CrowdFunding: CrowdFund is not open now.");
    });

    it("Check Deposit - Wrong Case - BaseToken not set", async () => {
      // Update CrowdFund
      await this.updatedProxy.connect(this.alice).updateCrowdFundBaseToken(
        1,
        "0x0000000000000000000000000000000000000000" // address(0)
      );
      // Try to Deposit Fund
      await expect(
        this.updatedProxy.connect(this.bob).depositFund(1, "10000000000000000")
      ).to.be.revertedWith("CrowdFunding: Base Token is not set.");
    });

    it("Check Deposit - Wrong Case - Over Timeline", async () => {
      // Pass 1 hour on EVM Provider
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Try to Deposit Fund
      await expect(
        this.updatedProxy.connect(this.bob).depositFund(1, "10000000000000000")
      ).to.be.revertedWith("CrowdFunding: Over timeline");

      // Revert 1 hour back on EVM Provider
      await ethers.provider.send("evm_increaseTime", [-3600]);
      await ethers.provider.send("evm_mine");
    });

    it("Check Deposit - Wrong Case - Goal Amount is zero", async () => {
      // Update CrowdFund
      await this.updatedProxy
        .connect(this.alice)
        .updateCrowdFundGoalAmount(1, "0");
      // Try to Deposit Fund
      await expect(
        this.updatedProxy.connect(this.bob).depositFund(1, "10000000000000000")
      ).to.be.revertedWith("CrowdFunding: Funding amount is not set.");
    });

    it("Check Deposit - Multi Deposit Funds", async () => {
      // Approve Base Token to CrowdFund Contract, 5 Base Token, from Alice
      await this.BaseToken.connect(this.alice).approve(
        this.updatedProxy.address,
        "5000000000000000000" // 5 BST
      );

      // Approve Base Token to CrowdFund Contract, 10 Base Token, from Bob
      await this.BaseToken.connect(this.bob).approve(
        this.updatedProxy.address,
        "10000000000000000000" // 10 BST
      );

      // Deposit Funds to CrowdFund1
      await this.updatedProxy
        .connect(this.alice)
        .depositFund(1, "1000000000000000000");
      await this.updatedProxy
        .connect(this.bob)
        .depositFund(1, "3000000000000000000");

      // Deposit Funds to CrowdFund2
      await this.updatedProxy
        .connect(this.alice)
        .depositFund(2, "2000000000000000000");
      await this.updatedProxy
        .connect(this.bob)
        .depositFund(2, "4000000000000000000");

      // Check Total Funded Amount with CrowdFund1
      assert.equal(
        (await this.updatedProxy.crowdFundList(1)).totalFundedAmount,
        "4000000000000000000" // 1 + 3 = 4
      );
      // Check User Funded Balance with CrowdFund1
      assert.equal(
        await this.updatedProxy.getUserCrowdFund(1, this.alice.address),
        "1000000000000000000"
      );
      assert.equal(
        await this.updatedProxy.getUserCrowdFund(1, this.bob.address),
        "3000000000000000000"
      );

      // Check Total Funded Amount with CrowdFund2
      assert.equal(
        (await this.updatedProxy.crowdFundList(2)).totalFundedAmount,
        "6000000000000000000" // 2 + 4 = 6
      );
      // Check User Funded Balance with CrowdFund2
      assert.equal(
        await this.updatedProxy.getUserCrowdFund(2, this.alice.address),
        "2000000000000000000"
      );
      assert.equal(
        await this.updatedProxy.getUserCrowdFund(2, this.bob.address),
        "4000000000000000000"
      );

      // Check User Balance
      assert.equal(
        await this.BaseToken.balanceOf(this.alice.address),
        "7000000000000000000" // 5 - 1 - 2 = 2
      );
      assert.equal(
        await this.BaseToken.balanceOf(this.bob.address),
        "13000000000000000000" // 20 - 3 - 4 = 13
      );

      // Check Contract Balance
      assert.equal(
        await this.BaseToken.balanceOf(this.updatedProxy.address),
        "10000000000000000000" // 4 + 6 = 10
      );
    });
  });

  describe("Test CrowdFund - Withdraw Fund", async () => {
    beforeEach(async () => {
      this.goalTimeline = Math.floor(Date.now() / 1000) + 3600; // current_time + 1 hour

      // Create Two DepositFunds
      await this.updatedProxy.connect(this.alice).createNewCrowdFunding(
        this.goalTimeline,
        this.BaseToken.address,
        "5000000000000000000" // 5 BST
      );
      await this.updatedProxy.connect(this.bob).createNewCrowdFunding(
        this.goalTimeline,
        this.BaseToken.address,
        "10000000000000000000" // 10 BST
      );

      // Send Base Token, 10 Base Token to Alice's address
      await this.BaseToken.connect(this.owner).transfer(
        this.alice.address,
        "10000000000000000000" // 10 BST
      );
      // Send Base Token, 20 Base Token to Bob's address
      await this.BaseToken.connect(this.owner).transfer(
        this.bob.address,
        "20000000000000000000" // 20 BST
      );

      // Approve Base Token to CrowdFund Contract, 5 Base Token, from Alice
      await this.BaseToken.connect(this.alice).approve(
        this.updatedProxy.address,
        "5000000000000000000" // 5 BST
      );
      // Deposit Funds to CrowdFund1 from Alice
      await this.updatedProxy
        .connect(this.alice)
        .depositFund(1, "1000000000000000000"); // Deposit 1 BST
    });

    it("Check Withdraw - Wrong Case - CrowdFund not open", async () => {
      // Update CrowdFund
      await this.updatedProxy
        .connect(this.alice)
        .updateCrowdFundIsOpen(1, false);

      // Try to Withdraw Fund
      await expect(
        this.updatedProxy.connect(this.alice).withdrawFund(1)
      ).to.be.revertedWith("CrowdFunding Withdraw: CrowdFund is not open now.");
    });

    it("Check Withdraw - Wrong Case - Still on Progress", async () => {
      // Pass 30mins on EVM Provider
      await ethers.provider.send("evm_increaseTime", [1800]);
      await ethers.provider.send("evm_mine");

      // Try to Withdraw Fund
      await expect(
        this.updatedProxy.connect(this.alice).withdrawFund(1)
      ).to.be.revertedWith(
        "CrowdFunding Withdraw: Crowd Funding is still on progress."
      );

      // Revert 30mins back on EVM Provider
      await ethers.provider.send("evm_increaseTime", [-1800]);
      await ethers.provider.send("evm_mine");
    });

    it("Check Withdraw - Wrong Case - No Deposit", async () => {
      // Pass 1 hour on EVM Provider
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Try to Withdraw Fund
      await expect(
        this.updatedProxy.connect(this.bob).withdrawFund(1)
      ).to.be.revertedWith(
        "CrowdFunding Withdraw: Funded amount should be more than zero."
      );

      // Revert 1 hour back on EVM Provider
      await ethers.provider.send("evm_increaseTime", [-3600]);
      await ethers.provider.send("evm_mine");
    });

    it("Check Withdraw - Wrong Case - Goal already archived", async () => {
      // Approve Base Token to CrowdFund Contract, 5 Base Token, from Bob
      await this.BaseToken.connect(this.bob).approve(
        this.updatedProxy.address,
        "10000000000000000000" // 10 BST
      );
      // Deposit Funds to CrowdFund1 from Bob
      await this.updatedProxy
        .connect(this.bob)
        .depositFund(1, "5000000000000000000");

      // Pass 1 hour on EVM Provider
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Try to Withdraw Fund
      await expect(
        this.updatedProxy.connect(this.bob).withdrawFund(1)
      ).to.be.revertedWith(
        "CrowdFunding Withdraw: Total funded amount should be less than goal amount."
      );

      // Revert 1 hour back on EVM Provider
      await ethers.provider.send("evm_increaseTime", [-3600]);
      await ethers.provider.send("evm_mine");
    });

    it("Check Withdraw", async () => {
      // Pass 1 hour on EVM Provider
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Withdraw Fund
      await this.updatedProxy.connect(this.alice).withdrawFund(1);

      // Check User Balance
      assert.equal(
        await this.BaseToken.balanceOf(this.alice.address),
        "10000000000000000000"
      );
      // Check Fund Balance
      assert.equal(
        (await this.updatedProxy.crowdFundList(1)).totalFundedAmount,
        "0"
      );
      // Check Contract Balance
      assert.equal(
        await this.BaseToken.balanceOf(this.updatedProxy.address),
        "0"
      );

      // Revert 1 hour back on EVM Provider
      await ethers.provider.send("evm_increaseTime", [-3600]);
      await ethers.provider.send("evm_mine");
    });
  });
});
