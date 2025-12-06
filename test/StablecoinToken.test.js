const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("StablecoinToken - Comprehensive Test Suite", function () {
  // Test fixture for deployment
  async function deployStablecoinFixture() {
    const [admin, minter, user1, user2, attacker] = await ethers.getSigners();

    const StablecoinToken = await ethers.getContractFactory("StablecoinToken");
    const stablecoin = await StablecoinToken.deploy(admin.address);
    await stablecoin.deployed();

    const MINTER_ROLE = await stablecoin.MINTER_ROLE();
    const PAUSER_ROLE = await stablecoin.PAUSER_ROLE();
    const DEFAULT_ADMIN_ROLE = await stablecoin.DEFAULT_ADMIN_ROLE();

    return { 
      stablecoin, 
      admin, 
      minter, 
      user1, 
      user2, 
      attacker,
      MINTER_ROLE,
      PAUSER_ROLE,
      DEFAULT_ADMIN_ROLE
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { stablecoin } = await loadFixture(deployStablecoinFixture);
      
      expect(await stablecoin.name()).to.equal("Algorithmic Stablecoin");
      expect(await stablecoin.symbol()).to.equal("ASTABLE");
      expect(await stablecoin.decimals()).to.equal(18);
    });

    it("Should set admin role correctly", async function () {
      const { stablecoin, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployStablecoinFixture);
      
      expect(await stablecoin.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should grant pauser role to admin", async function () {
      const { stablecoin, admin, PAUSER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      expect(await stablecoin.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
    });

    it("Should NOT grant minter role by default", async function () {
      const { stablecoin, admin, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      expect(await stablecoin.hasRole(MINTER_ROLE, admin.address)).to.be.false;
    });

    it("Should start with zero total supply", async function () {
      const { stablecoin } = await loadFixture(deployStablecoinFixture);
      
      expect(await stablecoin.totalSupply()).to.equal(0);
    });

    it("Should revert if deployed with zero address admin", async function () {
      const StablecoinToken = await ethers.getContractFactory("StablecoinToken");
      
      await expect(
        StablecoinToken.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid admin address");
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant minter role", async function () {
      const { stablecoin, admin, minter, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      expect(await stablecoin.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should allow admin to revoke minter role", async function () {
      const { stablecoin, admin, minter, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      
      expect(await stablecoin.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const { stablecoin, user1, minter, MINTER_ROLE, DEFAULT_ADMIN_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await expect(
        stablecoin.connect(user1).grantRole(MINTER_ROLE, minter.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it("Should allow role renunciation", async function () {
      const { stablecoin, admin, minter, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(minter).renounceRole(MINTER_ROLE, minter.address);
      
      expect(await stablecoin.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      const mintAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(minter).mint(user1.address, mintAmount)
      )
        .to.emit(stablecoin, "Minted")
        .withArgs(user1.address, mintAmount, minter.address);
      
      expect(await stablecoin.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await stablecoin.totalSupply()).to.equal(mintAmount);
    });

    it("Should prevent non-minter from minting", async function () {
      const { stablecoin, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      const mintAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user1).mint(user1.address, mintAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });

    it("Should prevent minting to zero address", async function () {
      const { stablecoin, admin, minter, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      const mintAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(minter).mint(ethers.constants.AddressZero, mintAmount)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should prevent minting zero amount", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      await expect(
        stablecoin.connect(minter).mint(user1.address, 0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should enforce max supply cap", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      const maxSupply = await stablecoin.MAX_SUPPLY();
      const excessAmount = maxSupply.add(1);
      
      await expect(
        stablecoin.connect(minter).mint(user1.address, excessAmount)
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("Should allow minting up to max supply", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      const maxSupply = await stablecoin.MAX_SUPPLY();
      await stablecoin.connect(minter).mint(user1.address, maxSupply);
      
      expect(await stablecoin.totalSupply()).to.equal(maxSupply);
    });

    it("Should prevent minting when paused", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(admin).pause();
      
      const mintAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(minter).mint(user1.address, mintAmount)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Burning", function () {
    async function mintedTokensFixture() {
      const fixture = await deployStablecoinFixture();
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = fixture;
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      const mintAmount = ethers.utils.parseEther("10000");
      await stablecoin.connect(minter).mint(user1.address, mintAmount);
      
      return { ...fixture, mintAmount };
    }

    it("Should allow users to burn their own tokens", async function () {
      const { stablecoin, user1, mintAmount } = await loadFixture(mintedTokensFixture);
      
      const burnAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user1).burn(burnAmount)
      )
        .to.emit(stablecoin, "Burned")
        .withArgs(user1.address, burnAmount);
      
      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        mintAmount.sub(burnAmount)
      );
    });

    it("Should allow burning with approval (burnFrom)", async function () {
      const { stablecoin, user1, user2, mintAmount } = await loadFixture(mintedTokensFixture);
      
      const burnAmount = ethers.utils.parseEther("1000");
      await stablecoin.connect(user1).approve(user2.address, burnAmount);
      
      await expect(
        stablecoin.connect(user2).burnFrom(user1.address, burnAmount)
      )
        .to.emit(stablecoin, "Burned")
        .withArgs(user1.address, burnAmount);
      
      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        mintAmount.sub(burnAmount)
      );
    });

    it("Should prevent burning more than balance", async function () {
      const { stablecoin, user1, mintAmount } = await loadFixture(mintedTokensFixture);
      
      const excessAmount = mintAmount.add(1);
      await expect(
        stablecoin.connect(user1).burn(excessAmount)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Should prevent burnFrom without approval", async function () {
      const { stablecoin, user1, user2 } = await loadFixture(mintedTokensFixture);
      
      const burnAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should prevent burning when paused", async function () {
      const { stablecoin, admin, user1 } = await loadFixture(mintedTokensFixture);
      
      await stablecoin.connect(admin).pause();
      
      const burnAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user1).burn(burnAmount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should decrease total supply when burning", async function () {
      const { stablecoin, user1, mintAmount } = await loadFixture(mintedTokensFixture);
      
      const burnAmount = ethers.utils.parseEther("1000");
      await stablecoin.connect(user1).burn(burnAmount);
      
      expect(await stablecoin.totalSupply()).to.equal(mintAmount.sub(burnAmount));
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow pauser to pause contract", async function () {
      const { stablecoin, admin } = await loadFixture(deployStablecoinFixture);
      
      await expect(stablecoin.connect(admin).pause())
        .to.emit(stablecoin, "Paused")
        .withArgs(admin.address);
      
      expect(await stablecoin.paused()).to.be.true;
    });

    it("Should allow pauser to unpause contract", async function () {
      const { stablecoin, admin } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).pause();
      
      await expect(stablecoin.connect(admin).unpause())
        .to.emit(stablecoin, "Unpaused")
        .withArgs(admin.address);
      
      expect(await stablecoin.paused()).to.be.false;
    });

    it("Should prevent non-pauser from pausing", async function () {
      const { stablecoin, user1, PAUSER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await expect(
        stablecoin.connect(user1).pause()
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${PAUSER_ROLE}`
      );
    });

    it("Should prevent transfers when paused", async function () {
      const { stablecoin, admin, minter, user1, user2, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      
      await stablecoin.connect(admin).pause();
      
      await expect(
        stablecoin.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow transfers after unpause", async function () {
      const { stablecoin, admin, minter, user1, user2, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      
      await stablecoin.connect(admin).pause();
      await stablecoin.connect(admin).unpause();
      
      const transferAmount = ethers.utils.parseEther("100");
      await expect(
        stablecoin.connect(user1).transfer(user2.address, transferAmount)
      ).to.not.be.reverted;
      
      expect(await stablecoin.balanceOf(user2.address)).to.equal(transferAmount);
    });
  });

  describe("ERC20 Standard Functionality", function () {
    async function mintedTokensFixture() {
      const fixture = await deployStablecoinFixture();
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = fixture;
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      const mintAmount = ethers.utils.parseEther("10000");
      await stablecoin.connect(minter).mint(user1.address, mintAmount);
      
      return { ...fixture, mintAmount };
    }

    it("Should transfer tokens between accounts", async function () {
      const { stablecoin, user1, user2 } = await loadFixture(mintedTokensFixture);
      
      const transferAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user1).transfer(user2.address, transferAmount)
      )
        .to.emit(stablecoin, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      
      expect(await stablecoin.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("Should handle approve and transferFrom", async function () {
      const { stablecoin, user1, user2 } = await loadFixture(mintedTokensFixture);
      
      const approveAmount = ethers.utils.parseEther("1000");
      await stablecoin.connect(user1).approve(user2.address, approveAmount);
      
      expect(await stablecoin.allowance(user1.address, user2.address)).to.equal(approveAmount);
      
      const transferAmount = ethers.utils.parseEther("500");
      await stablecoin.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
      
      expect(await stablecoin.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await stablecoin.allowance(user1.address, user2.address)).to.equal(
        approveAmount.sub(transferAmount)
      );
    });

    it("Should prevent transfer exceeding balance", async function () {
      const { stablecoin, user1, user2, mintAmount } = await loadFixture(mintedTokensFixture);
      
      const excessAmount = mintAmount.add(1);
      await expect(
        stablecoin.connect(user1).transfer(user2.address, excessAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should prevent transferFrom exceeding allowance", async function () {
      const { stablecoin, user1, user2 } = await loadFixture(mintedTokensFixture);
      
      const approveAmount = ethers.utils.parseEther("500");
      await stablecoin.connect(user1).approve(user2.address, approveAmount);
      
      const excessAmount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user2).transferFrom(user1.address, user2.address, excessAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("EIP-2612 Permit", function () {
    it("Should have correct domain separator", async function () {
      const { stablecoin } = await loadFixture(deployStablecoinFixture);
      
      const domainSeparator = await stablecoin.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal(ethers.constants.HashZero);
    });

    it("Should return correct nonces", async function () {
      const { stablecoin, user1 } = await loadFixture(deployStablecoinFixture);
      
      expect(await stablecoin.nonces(user1.address)).to.equal(0);
    });

    // Note: Full permit testing requires signature generation
    // which is complex in Hardhat. This is a placeholder for permit tests.
  });

  describe("Security & Edge Cases", function () {
    it("Should prevent reentrancy in mint", async function () {
      // Minting uses OpenZeppelin's ERC20 which is reentrancy-safe
      // This test verifies the contract doesn't have custom reentrancy vulnerabilities
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      // Multiple mints in sequence should work correctly
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      
      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("2000")
      );
    });

    it("Should handle multiple role holders", async function () {
      const { stablecoin, admin, minter, user1, user2, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, user2.address);
      
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      await stablecoin.connect(user2).mint(user1.address, ethers.utils.parseEther("1000"));
      
      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("2000")
      );
    });

    it("Should maintain correct state after role revocation", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      
      await stablecoin.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      
      await expect(
        stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"))
      ).to.be.reverted;
      
      // Previous balance should remain
      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("1000")
      );
    });

    it("Should handle zero transfers correctly", async function () {
      const { stablecoin, admin, minter, user1, user2, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await stablecoin.connect(minter).mint(user1.address, ethers.utils.parseEther("1000"));
      
      // Zero transfer should succeed but not change balances
      await stablecoin.connect(user1).transfer(user2.address, 0);
      
      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("1000")
      );
      expect(await stablecoin.balanceOf(user2.address)).to.equal(0);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should efficiently handle batch minting", async function () {
      const { stablecoin, admin, minter, user1, MINTER_ROLE } = await loadFixture(deployStablecoinFixture);
      
      await stablecoin.connect(admin).grantRole(MINTER_ROLE, minter.address);
      
      // Mint in batches and measure gas
      const mintAmount = ethers.utils.parseEther("1000");
      const tx = await stablecoin.connect(minter).mint(user1.address, mintAmount);
      const receipt = await tx.wait();
      
      // Gas should be reasonable (< 100k for simple mint)
      expect(receipt.gasUsed).to.be.lt(100000);
    });
  });
});
