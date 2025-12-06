const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CollateralManager", function () {
  let collateralManager;
  let mockToken;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MOCK", 18);
    await mockToken.deployed();

    // Deploy CollateralManager
    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    collateralManager = await CollateralManager.deploy();
    await collateralManager.deployed();

    // Mint tokens to users
    await mockToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.utils.parseEther("1000"));
  });

  describe("Collateral Configuration", function () {
    it("Should add new collateral type", async function () {
      const config = {
        isActive: true,
        collateralFactor: 8000, // 80%
        liquidationThreshold: 8500, // 85%
        liquidationPenalty: 500, // 5%
        minDepositAmount: ethers.utils.parseEther("0.1"),
        priceOracle: ethers.constants.AddressZero
      };

      await expect(collateralManager.addCollateral(mockToken.address, config))
        .to.emit(collateralManager, "CollateralAdded")
        .withArgs(mockToken.address, Object.values(config));

      const storedConfig = await collateralManager.collateralConfigs(mockToken.address);
      expect(storedConfig.isActive).to.equal(true);
      expect(storedConfig.collateralFactor).to.equal(8000);
    });

    it("Should reject duplicate collateral", async function () {
      const config = {
        isActive: true,
        collateralFactor: 8000,
        liquidationThreshold: 8500,
        liquidationPenalty: 500,
        minDepositAmount: ethers.utils.parseEther("0.1"),
        priceOracle: ethers.constants.AddressZero
      };

      await collateralManager.addCollateral(mockToken.address, config);
      
      await expect(
        collateralManager.addCollateral(mockToken.address, config)
      ).to.be.revertedWith("Already exists");
    });

    it("Should reject invalid collateral factor", async function () {
      const config = {
        isActive: true,
        collateralFactor: 15000, // > 100%
        liquidationThreshold: 8500,
        liquidationPenalty: 500,
        minDepositAmount: ethers.utils.parseEther("0.1"),
        priceOracle: ethers.constants.AddressZero
      };

      await expect(
        collateralManager.addCollateral(mockToken.address, config)
      ).to.be.revertedWith("Invalid factor");
    });
  });

  describe("Collateral Deposits", function () {
    beforeEach(async function () {
      const config = {
        isActive: true,
        collateralFactor: 8000,
        liquidationThreshold: 8500,
        liquidationPenalty: 500,
        minDepositAmount: ethers.utils.parseEther("0.1"),
        priceOracle: ethers.constants.AddressZero
      };
      await collateralManager.addCollateral(mockToken.address, config);
    });

    it("Should deposit collateral successfully", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      
      await mockToken.connect(user1).approve(collateralManager.address, depositAmount);
      
      await expect(
        collateralManager.connect(user1).depositCollateral(mockToken.address, depositAmount)
      )
        .to.emit(collateralManager, "CollateralDeposited")
        .withArgs(user1.address, mockToken.address, depositAmount, await ethers.provider.getBlockNumber() + 1);

      const position = await collateralManager.getPosition(user1.address, mockToken.address);
      expect(position.amount).to.equal(depositAmount);
    });

    it("Should reject deposit below minimum", async function () {
      const depositAmount = ethers.utils.parseEther("0.05"); // Below 0.1 minimum
      
      await mockToken.connect(user1).approve(collateralManager.address, depositAmount);
      
      await expect(
        collateralManager.connect(user1).depositCollateral(mockToken.address, depositAmount)
      ).to.be.revertedWith("Below minimum");
    });

    it("Should reject unsupported collateral", async function () {
      const unsupportedToken = await (await ethers.getContractFactory("MockERC20"))
        .deploy("Unsupported", "UNSUP", 18);
      
      await expect(
        collateralManager.connect(user1).depositCollateral(unsupportedToken.address, 100)
      ).to.be.revertedWith("Collateral not supported");
    });
  });

  describe("Collateral Withdrawals", function () {
    beforeEach(async function () {
      const config = {
        isActive: true,
        collateralFactor: 8000,
        liquidationThreshold: 8500,
        liquidationPenalty: 500,
        minDepositAmount: ethers.utils.parseEther("0.1"),
        priceOracle: ethers.constants.AddressZero
      };
      await collateralManager.addCollateral(mockToken.address, config);

      // Deposit collateral
      const depositAmount = ethers.utils.parseEther("100");
      await mockToken.connect(user1).approve(collateralManager.address, depositAmount);
      await collateralManager.connect(user1).depositCollateral(mockToken.address, depositAmount);
    });

    it("Should withdraw collateral successfully", async function () {
      const withdrawAmount = ethers.utils.parseEther("50");
      
      await expect(
        collateralManager.connect(user1).withdrawCollateral(mockToken.address, withdrawAmount)
      )
        .to.emit(collateralManager, "CollateralWithdrawn")
        .withArgs(user1.address, mockToken.address, withdrawAmount, await ethers.provider.getBlockNumber() + 1);

      const position = await collateralManager.getPosition(user1.address, mockToken.address);
      expect(position.amount).to.equal(ethers.utils.parseEther("50"));
    });

    it("Should reject withdrawal exceeding balance", async function () {
      const withdrawAmount = ethers.utils.parseEther("150");
      
      await expect(
        collateralManager.connect(user1).withdrawCollateral(mockToken.address, withdrawAmount)
      ).to.be.revertedWith("Insufficient collateral");
    });
  });

  describe("View Functions", function () {
    it("Should return supported collateral list", async function () {
      const config = {
        isActive: true,
        collateralFactor: 8000,
        liquidationThreshold: 8500,
        liquidationPenalty: 500,
        minDepositAmount: ethers.utils.parseEther("0.1"),
        priceOracle: ethers.constants.AddressZero
      };

      await collateralManager.addCollateral(mockToken.address, config);
      
      const supported = await collateralManager.getSupportedCollateral();
      expect(supported.length).to.equal(1);
      expect(supported[0]).to.equal(mockToken.address);
    });
  });
});
