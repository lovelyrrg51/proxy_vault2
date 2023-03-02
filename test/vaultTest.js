const { assert, expect } = require("chai");
const { ethers, contract, artifacts } = require("hardhat");

const Vault = artifacts.require("Vault");
const BaseToken = artifacts.require("BaseToken");

contract("Simple Vault Test", () => {
  beforeEach(async () => {
    const [owner, alice, bob] = await ethers.getSigners();

    this.owner = owner;
    this.alice = alice;
    this.bob = bob;

    // Vault Contract
    this.VaultInstance = await Vault.new();

    const vault = await ethers.getContractFactory("Vault");
    this.Vault = await vault.deploy();
    await this.Vault.deployed();

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
    await this.Proxy.connect(this.owner).setImplementation(this.Vault.address);

    // Get Updated Proxy from Vault Contract
    this.updatedProxy = new ethers.Contract(
      this.Proxy.address,
      this.VaultInstance.abi,
      this.owner
    );
  });

  describe("Test Vault - Initialize", async () => {
    it("Check Proxy Address", async () => {
      assert.equal(await this.Proxy.getImplementation(), this.Vault.address);
    });

    it("Check Initialized Variables", async () => {
      // Check isDeposit Value
      assert.equal(await this.updatedProxy.isDeposit(), false);
      // Check Deposit Goal Amount
      assert.equal(await this.updatedProxy.depositGoalAmount(), "0");
      // Check Base Token Address
      assert.equal(
        await this.updatedProxy.baseToken(),
        "0x0000000000000000000000000000000000000000"
      );
    });
  });

  describe("Test Vault - Owner(Admin) Functions", async () => {
    it("Check Deposit Status", async () => {
      // Check isDeposit Value
      assert.equal(await this.updatedProxy.isDeposit(), false);

      // Try to update Deposit Status from non-Owner
      await expect(
        this.updatedProxy.connect(this.alice).updateDepositStatus(true)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Update Deposit Status from Owner
      await this.updatedProxy.connect(this.owner).updateDepositStatus(true);

      // Check isDeposit Value after updated
      assert.equal(await this.updatedProxy.isDeposit(), true);
    });

    it("Check Deposit Goal Amount", async () => {
      // Check Deposit Goal Amount
      assert.equal(await this.updatedProxy.depositGoalAmount(), "0");

      // Try to update Deposit Goal Amount from non-Owner
      await expect(
        this.updatedProxy
          .connect(this.alice)
          .updateDepositGoalAmount("1000000000000000000") // 1 Base Token
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Update Deposit Goal Amount from Owner
      await this.updatedProxy
        .connect(this.owner)
        .updateDepositGoalAmount("2000000000000000000"); // 2 Base Token

      // Check Deposit Goal Amount after updated
      assert.equal(
        await this.updatedProxy.depositGoalAmount(),
        "2000000000000000000"
      );
    });

    it("Check Base Token Address", async () => {
      // Check Base Token Address
      assert.equal(
        await this.updatedProxy.baseToken(),
        "0x0000000000000000000000000000000000000000"
      );

      // Try to update Base Token Address
      await expect(
        this.updatedProxy
          .connect(this.alice)
          .updateBaseTokenAddress(this.BaseToken.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Update Base Token Address from Owner
      await this.updatedProxy
        .connect(this.owner)
        .updateBaseTokenAddress(this.BaseToken.address);

      // Check Base Token Address after updated
      assert.equal(await this.updatedProxy.baseToken(), this.BaseToken.address);
    });
  });

  describe("Test Vault - Deposit", async () => {
    beforeEach(async () => {
      // Update Deposit Status
      await this.updatedProxy.connect(this.owner).updateDepositStatus(true);

      // Update Deposit Goal Amount
      await this.updatedProxy
        .connect(this.owner)
        .updateDepositGoalAmount("2000000000000000000"); // 2 Base Token

      // Update Base Token Address
      await this.updatedProxy
        .connect(this.owner)
        .updateBaseTokenAddress(this.BaseToken.address);

      // Send Base Token, 10 Base Token to Alice's address
      await this.BaseToken.connect(this.owner).transfer(
        this.alice.address,
        "10000000000000000000"
      );

      // Send Base Token, 20 Base Token to Bob's address
      await this.BaseToken.connect(this.owner).transfer(
        this.bob.address,
        "20000000000000000000"
      );
    });

    it("Check - Balance of Base Token", async () => {
      // Check Alice's Balance of Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.alice.address),
        "10000000000000000000"
      );

      // Check Bob's Balance of Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.bob.address),
        "20000000000000000000"
      );

      // Check Owner's Balance of Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.owner.address),
        "999999970000000000000000000"
      );
    });

    it("Check - Deposit Once from Alice", async () => {
      // Approve Base Token to Vault Contract, 3 Base Token
      await this.BaseToken.connect(this.alice).approve(
        this.updatedProxy.address,
        "3000000000000000000"
      );

      // Deposit 3 Base Token to Vault
      await this.updatedProxy
        .connect(this.alice)
        .deposit("3000000000000000000");

      // Check User Deposit Amount
      assert.equal(
        await this.updatedProxy.userDepositBalance(this.alice.address),
        "3000000000000000000"
      );
      assert.equal(
        await this.updatedProxy.checkUserDepositAmount(this.alice.address),
        true
      );

      // Check Alice's Balance of Base Token, equal to 7 Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.alice.address),
        "7000000000000000000"
      );
    });

    it("Check - Deposit Twice from Bob", async () => {
      // Approve Base Token to Vault Contract, 5 Base Token
      await this.BaseToken.connect(this.bob).approve(
        this.updatedProxy.address,
        "5000000000000000000"
      );

      // Deposit 1 Base Token to Vault as first
      await this.updatedProxy.connect(this.bob).deposit("1000000000000000000");
      // Check User Deposit Amount
      assert.equal(
        await this.updatedProxy.userDepositBalance(this.bob.address),
        "1000000000000000000"
      );
      assert.equal(
        await this.updatedProxy.checkUserDepositAmount(this.bob.address),
        false
      );

      // Deposit 4 Base Token to Vault as second
      await this.updatedProxy.connect(this.bob).deposit("4000000000000000000");
      // Check User Deposit Amount, equal to 5(1 + 4) Base Token
      assert.equal(
        await this.updatedProxy.userDepositBalance(this.bob.address),
        "5000000000000000000"
      );
      assert.equal(
        await this.updatedProxy.checkUserDepositAmount(this.bob.address),
        true
      );

      // Check Bob's Balance of Base Token, equal to 15 Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.bob.address),
        "15000000000000000000"
      );
    });
  });
  describe("Test Vault - Withdraw", async () => {
    beforeEach(async () => {
      // Update Deposit Status
      await this.updatedProxy.connect(this.owner).updateDepositStatus(true);

      // Update Deposit Goal Amount
      await this.updatedProxy
        .connect(this.owner)
        .updateDepositGoalAmount("2000000000000000000"); // 2 Base Token

      // Update Base Token Address
      await this.updatedProxy
        .connect(this.owner)
        .updateBaseTokenAddress(this.BaseToken.address);

      // Send Base Token, 10 Base Token to Alice's address
      await this.BaseToken.connect(this.owner).transfer(
        this.alice.address,
        "10000000000000000000"
      );

      // Send Base Token, 20 Base Token to Bob's address
      await this.BaseToken.connect(this.owner).transfer(
        this.bob.address,
        "20000000000000000000"
      );
    });

    it("Check - Balance of Base Token", async () => {
      // Check Alice's Balance of Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.alice.address),
        "10000000000000000000"
      );

      // Check Bob's Balance of Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.bob.address),
        "20000000000000000000"
      );

      // Check Owner's Balance of Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.owner.address),
        "999999970000000000000000000"
      );
    });

    it("Check - withdraw from vault when deposit amouont is bigger than goal amount.", async () => {
      // Try to withdraw when deposit amount is zero.
      await expect(
        this.updatedProxy.connect(this.alice).withdraw()
      ).to.be.revertedWith(
        "Vault Withdraw: Deposited amount should be more than zero."
      );

      // Approve Base Token to Vault Contract, 3 Base Token
      await this.BaseToken.connect(this.alice).approve(
        this.updatedProxy.address,
        "3000000000000000000"
      );

      // Deposit 3 Base Token to Vault
      await this.updatedProxy
        .connect(this.alice)
        .deposit("3000000000000000000");
      // Check User Deposit Amount
      assert.equal(
        await this.updatedProxy.userDepositBalance(this.alice.address),
        "3000000000000000000"
      );

      // Try to withdraw when deposit amount is bigger than goal amount
      await expect(
        this.updatedProxy.connect(this.alice).withdraw()
      ).to.be.revertedWith(
        "Vault Withdraw: Deposited amount should be less than goal amount."
      );
    });

    it("Check - withdraw from vault when deposit amount is less than goal amount.", async () => {
      // Approve Base Token to Vault Contract, 1.5 Base Token
      await this.BaseToken.connect(this.bob).approve(
        this.updatedProxy.address,
        "1500000000000000000"
      );

      // Deposit 1.5 Base Token to Vault as first
      await this.updatedProxy.connect(this.bob).deposit("1500000000000000000");
      // Check User Deposit Amount
      assert.equal(
        await this.updatedProxy.userDepositBalance(this.bob.address),
        "1500000000000000000"
      );
      assert.equal(
        await this.updatedProxy.checkUserDepositAmount(this.bob.address),
        false
      );

      // Withdraw from Vault, it would be success because deposit amount is less than goal amount.
      await this.updatedProxy.connect(this.bob).withdraw();

      // Check user Deposit Amount after withdraw
      assert.equal(
        await this.updatedProxy.userDepositBalance(this.bob.address),
        "0"
      );
      // Check Bob's Balance of Base Token, equal to 20 Base Token
      assert.equal(
        await this.BaseToken.balanceOf(this.bob.address),
        "20000000000000000000"
      );
    });
  });
});
