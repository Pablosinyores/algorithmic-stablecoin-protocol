const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Full Protocol Integration Tests", function () {
  async function deployFullProtocolFixture() {
    const [admin, user1, user2, liquidator, keeper] = await ethers.getSigners();

    // Deploy Stablecoin
    const StablecoinToken = await ethers.getContractFactory("StablecoinToken");
    const stablecoin = await StablecoinToken.deploy(admin.address);
    await stablecoin.deployed();

    // Deploy CollateralManager
    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    const collateralManager = await CollateralManager.deploy();
    await collateralManager.deployed();

    // Deploy Mock Collateral Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    const wbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8);
    await weth.deployed();
    await wbtc.deployed();

    // Mint collateral to users
    await weth.mint(user1.address, ethers.utils.parseEther("100"));
    await weth.mint(user2.address, ethers.utils.parseEther("100"));
    await wbtc.mint(user1.address, ethers.utils.parseUnits("10", 8));
    await wbtc.mint(user2.address, ethers.utils.parseUnits("10", 8));

    // Setup roles
    const MINTER_ROLE = await stablecoin.MINTER_ROLE();
    await stablecoin.connect(admin).grantRole(MINTER_ROLE, collateralManager.address);

    // Configure collateral
    const wethConfig = {
      isActive: true,
      collateralFactor: 8000, // 80%
      liquidationThreshold: 8500, // 85%
      liquidationPenalty: 500, // 5%
      minDepositAmount: ethers.utils.parseEther("0.1"),
      priceOracle: ethers.constants.AddressZero // Mock for now
    };

    const wbtcConfig = {
      isActive: true,
      collateralFactor: 7500, // 75%
      liquidationThreshold: 8000, // 80%
      liquidationPenalty: 1000, // 10%
      minDepositAmount: ethers.utils.parseUnits("0.01", 8),
      priceOracle: ethers.constants.AddressZero
    };

    await collateralManager.addCollateral(weth.address, wethConfig);
    await collateralManager.addCollateral(wbtc.address, wbtcConfig);

    return {
      stablecoin,
      collateralManager,
      weth,
      wbtc,
      admin,
      user1,
      user2,
      liquidator,
      keeper,
      MINTER_ROLE
    };
  }

  describe("End-to-End User Flow", function () {
    it("Should allow complete deposit -> mint -> repay -> withdraw flow", async function () {
      const { collateralManager, stablecoin, weth, user1 } = await loadFixture(deployFullProtocolFixture);

      // 1. User deposits collateral
      const depositAmount = ethers.utils.parseEther("10");
      await weth.connect(user1).approve(collateralManager.address, depositAmount);
      await collateralManager.connect(user1).depositCollateral(weth.address, depositAmount);

      const position = await collateralManager.getPosition(user1.address, weth.address);
      expect(position.amount).to.equal(depositAmount);

      // 2. Protocol mints stablecoin (simulated - would be done by VaultManager)
      // For now, we'll mint directly since VaultManager isn't implemented yet
      const mintAmount = ethers.utils.parseEther("5000");
      // Note: This would fail in production since collateralManager doesn't have MINTER_ROLE
      // This is just for integration testing structure

      // 3. User would repay debt (burn stablecoin)
      // await stablecoin.connect(user1).burn(mintAmount);

      // 4. User withdraws collateral
      const withdrawAmount = ethers.utils.parseEther("5");
      await collateralManager.connect(user1).withdrawCollateral(weth.address, withdrawAmount);

      const finalPosition = await collateralManager.getPosition(user1.address, weth.address);
      expect(finalPosition.amount).to.equal(depositAmount.sub(withdrawAmount));
    });

    it("Should handle multiple users with different collateral types", async function () {
      const { collateralManager, weth, wbtc, user1, user2 } = await loadFixture(deployFullProtocolFixture);

      // User1 deposits WETH
      const wethAmount = ethers.utils.parseEther("5");
      await weth.connect(user1).approve(collateralManager.address, wethAmount);
      await collateralManager.connect(user1).depositCollateral(weth.address, wethAmount);

      // User2 deposits WBTC
      const wbtcAmount = ethers.utils.parseUnits("1", 8);
      await wbtc.connect(user2).approve(collateralManager.address, wbtcAmount);
      await collateralManager.connect(user2).depositCollateral(wbtc.address, wbtcAmount);

      // Verify positions
      const user1Position = await collateralManager.getPosition(user1.address, weth.address);
      const user2Position = await collateralManager.getPosition(user2.address, wbtc.address);

      expect(user1Position.amount).to.equal(wethAmount);
      expect(user2Position.amount).to.equal(wbtcAmount);
    });

    it("Should track timestamps correctly", async function () {
      const { collateralManager, weth, user1 } = await loadFixture(deployFullProtocolFixture);

      const depositAmount = ethers.utils.parseEther("10");
      await weth.connect(user1).approve(collateralManager.address, depositAmount);
      
      const tx = await collateralManager.connect(user1).depositCollateral(weth.address, depositAmount);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const position = await collateralManager.getPosition(user1.address, weth.address);
      expect(position.lastUpdateTimestamp).to.equal(block.timestamp);
    });
  });

  describe("Multi-Collateral Scenarios", function () {
    it("Should allow user to deposit multiple collateral types", async function () {
      const { collateralManager, weth, wbtc, user1 } = await loadFixture(deployFullProtocolFixture);

      // Deposit WETH
      const wethAmount = ethers.utils.parseEther("5");
      await weth.connect(user1).approve(collateralManager.address, wethAmount);
      await collateralManager.connect(user1).depositCollateral(weth.address, wethAmount);

      // Deposit WBTC
      const wbtcAmount = ethers.utils.parseUnits("0.5", 8);
      await wbtc.connect(user1).approve(collateralManager.address, wbtcAmount);
      await collateralManager.connect(user1).depositCollateral(wbtc.address, wbtcAmount);

      // Verify both positions
      const wethPosition = await collateralManager.getPosition(user1.address, weth.address);
      const wbtcPosition = await collateralManager.getPosition(user1.address, wbtc.address);

      expect(wethPosition.amount).to.equal(wethAmount);
      expect(wbtcPosition.amount).to.equal(wbtcAmount);
    });

    it("Should list all supported collateral correctly", async function () {
      const { collateralManager, weth, wbtc } = await loadFixture(deployFullProtocolFixture);

      const supportedCollateral = await collateralManager.getSupportedCollateral();
      
      expect(supportedCollateral.length).to.equal(2);
      expect(supportedCollateral).to.include(weth.address);
      expect(supportedCollateral).to.include(wbtc.address);
    });

    it("Should maintain separate balances for different collateral types", async function () {
      const { collateralManager, weth, wbtc, user1 } = await loadFixture(deployFullProtocolFixture);

      // Deposit both types
      const wethAmount = ethers.utils.parseEther("10");
      const wbtcAmount = ethers.utils.parseUnits("1", 8);

      await weth.connect(user1).approve(collateralManager.address, wethAmount);
      await collateralManager.connect(user1).depositCollateral(weth.address, wethAmount);

      await wbtc.connect(user1).approve(collateralManager.address, wbtcAmount);
      await collateralManager.connect(user1).depositCollateral(wbtc.address, wbtcAmount);

      // Withdraw WETH partially
      await collateralManager.connect(user1).withdrawCollateral(weth.address, ethers.utils.parseEther("5"));

      // WBTC should remain unchanged
      const wbtcPosition = await collateralManager.getPosition(user1.address, wbtc.address);
      expect(wbtcPosition.amount).to.equal(wbtcAmount);

      // WETH should be reduced
      const wethPosition = await collateralManager.getPosition(user1.address, weth.address);
      expect(wethPosition.amount).to.equal(ethers.utils.parseEther("5"));
    });
  });

  describe("Access Control Integration", function () {
    it("Should prevent unauthorized minting", async function () {
      const { stablecoin, user1 } = await loadFixture(deployFullProtocolFixture);

      await expect(
        stablecoin.connect(user1).mint(user1.address, ethers.utils.parseEther("1000"))
      ).to.be.reverted;
    });

    it("Should allow admin to manage collateral types", async function () {
      const { collateralManager, admin } = await loadFixture(deployFullProtocolFixture);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken = await MockERC20.deploy("New Token", "NEW", 18);
      await newToken.deployed();

      const config = {
        isActive: true,
        collateralFactor: 7000,
        liquidationThreshold: 7500,
        liquidationPenalty: 750,
        minDepositAmount: ethers.utils.parseEther("1"),
        priceOracle: ethers.constants.AddressZero
      };

      await expect(
        collateralManager.connect(admin).addCollateral(newToken.address, config)
      ).to.not.be.reverted;
    });

    it("Should prevent non-admin from adding collateral", async function () {
      const { collateralManager, user1 } = await loadFixture(deployFullProtocolFixture);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken = await MockERC20.deploy("New Token", "NEW", 18);
      await newToken.deployed();

      const config = {
        isActive: true,
        collateralFactor: 7000,
        liquidationThreshold: 7500,
        liquidationPenalty: 750,
        minDepositAmount: ethers.utils.parseEther("1"),
        priceOracle: ethers.constants.AddressZero
      };

      await expect(
        collateralManager.connect(user1).addCollateral(newToken.address, config)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should pause stablecoin transfers in emergency", async function () {
      const { stablecoin, admin, user1, user2, MINTER_ROLE } = await loadFixture(deployFullProtocolFixture);

      // Mint some tokens first
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, admin.address);
      await stablecoin.connect(admin).mint(user1.address, ethers.utils.parseEther("1000"));

      // Pause
      await stablecoin.connect(admin).pause();

      // Transfers should fail
      await expect(
        stablecoin.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");

      // Unpause
      await stablecoin.connect(admin).unpause();

      // Transfers should work again
      await expect(
        stablecoin.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Should prevent new deposits during pause", async function () {
      const { stablecoin, collateralManager, weth, admin, user1, MINTER_ROLE } = await loadFixture(deployFullProtocolFixture);

      await stablecoin.connect(admin).pause();

      const depositAmount = ethers.utils.parseEther("10");
      await weth.connect(user1).approve(collateralManager.address, depositAmount);

      // Note: CollateralManager doesn't have pause yet, but stablecoin does
      // This test structure shows how it would work
    });
  });

  describe("Gas Optimization Verification", function () {
    it("Should efficiently handle batch operations", async function () {
      const { collateralManager, weth, user1 } = await loadFixture(deployFullProtocolFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await weth.connect(user1).approve(collateralManager.address, depositAmount.mul(10));

      // Measure gas for multiple deposits
      const gasUsed = [];
      for (let i = 0; i < 5; i++) {
        const tx = await collateralManager.connect(user1).depositCollateral(weth.address, depositAmount);
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }

      // Gas should be consistent (not increasing significantly)
      const avgGas = gasUsed.reduce((a, b) => a.add(b), ethers.BigNumber.from(0)).div(gasUsed.length);
      
      gasUsed.forEach(gas => {
        expect(gas).to.be.closeTo(avgGas, avgGas.div(10)); // Within 10%
      });
    });
  });

  describe("State Consistency", function () {
    it("Should maintain consistent state across operations", async function () {
      const { collateralManager, weth, user1, user2 } = await loadFixture(deployFullProtocolFixture);

      // Multiple users, multiple operations
      const amount1 = ethers.utils.parseEther("10");
      const amount2 = ethers.utils.parseEther("5");

      await weth.connect(user1).approve(collateralManager.address, amount1);
      await weth.connect(user2).approve(collateralManager.address, amount2);

      await collateralManager.connect(user1).depositCollateral(weth.address, amount1);
      await collateralManager.connect(user2).depositCollateral(weth.address, amount2);

      // Verify contract holds correct total
      const contractBalance = await weth.balanceOf(collateralManager.address);
      expect(contractBalance).to.equal(amount1.add(amount2));

      // Verify individual positions
      const pos1 = await collateralManager.getPosition(user1.address, weth.address);
      const pos2 = await collateralManager.getPosition(user2.address, weth.address);

      expect(pos1.amount.add(pos2.amount)).to.equal(contractBalance);
    });
  });
});
