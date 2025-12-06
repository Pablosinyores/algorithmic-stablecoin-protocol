const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RiskCalculator Library - Comprehensive Test Suite", function () {
  let riskCalculatorTest;

  // Deploy a test contract that uses the library
  before(async function () {
    const RiskCalculatorTest = await ethers.getContractFactory("RiskCalculatorTest");
    riskCalculatorTest = await RiskCalculatorTest.deploy();
    await riskCalculatorTest.deployed();
  });

  describe("Health Factor Calculation", function () {
    it("Should return max uint256 when debt is zero", async function () {
      const collateralValue = ethers.utils.parseEther("1000");
      const debtValue = 0;
      const liquidationThreshold = 8500; // 85%

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      expect(healthFactor).to.equal(ethers.constants.MaxUint256);
    });

    it("Should calculate correct health factor for healthy position", async function () {
      const collateralValue = ethers.utils.parseEther("1000"); // $1000
      const debtValue = ethers.utils.parseEther("500"); // $500
      const liquidationThreshold = 8500; // 85%

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      // Expected: (1000 * 0.85) / 500 = 1.7
      const expected = ethers.utils.parseEther("1.7");
      expect(healthFactor).to.equal(expected);
    });

    it("Should calculate health factor of 1.0 at liquidation threshold", async function () {
      const collateralValue = ethers.utils.parseEther("1000");
      const debtValue = ethers.utils.parseEther("850"); // Exactly at 85% threshold
      const liquidationThreshold = 8500;

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      const expected = ethers.utils.parseEther("1.0");
      expect(healthFactor).to.equal(expected);
    });

    it("Should calculate health factor below 1.0 for undercollateralized position", async function () {
      const collateralValue = ethers.utils.parseEther("1000");
      const debtValue = ethers.utils.parseEther("900"); // Above 85% threshold
      const liquidationThreshold = 8500;

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      // Expected: (1000 * 0.85) / 900 = 0.944...
      expect(healthFactor).to.be.lt(ethers.utils.parseEther("1.0"));
    });

    it("Should handle very small collateral values", async function () {
      const collateralValue = ethers.utils.parseEther("0.001");
      const debtValue = ethers.utils.parseEther("0.0005");
      const liquidationThreshold = 8500;

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      expect(healthFactor).to.be.gt(ethers.utils.parseEther("1.0"));
    });

    it("Should handle very large collateral values", async function () {
      const collateralValue = ethers.utils.parseEther("1000000000"); // 1 billion
      const debtValue = ethers.utils.parseEther("500000000"); // 500 million
      const liquidationThreshold = 8500;

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      const expected = ethers.utils.parseEther("1.7");
      expect(healthFactor).to.equal(expected);
    });

    it("Should handle different liquidation thresholds correctly", async function () {
      const collateralValue = ethers.utils.parseEther("1000");
      const debtValue = ethers.utils.parseEther("500");

      // Test with 75% threshold
      const hf75 = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        7500
      );
      expect(hf75).to.equal(ethers.utils.parseEther("1.5"));

      // Test with 90% threshold
      const hf90 = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        9000
      );
      expect(hf90).to.equal(ethers.utils.parseEther("1.8"));
    });

    it("Should handle zero collateral value", async function () {
      const collateralValue = 0;
      const debtValue = ethers.utils.parseEther("500");
      const liquidationThreshold = 8500;

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      expect(healthFactor).to.equal(0);
    });

    it("Should maintain precision with complex ratios", async function () {
      const collateralValue = ethers.utils.parseEther("1234.56789");
      const debtValue = ethers.utils.parseEther("789.12345");
      const liquidationThreshold = 8333; // 83.33%

      const healthFactor = await riskCalculatorTest.testCalculateHealthFactor(
        collateralValue,
        debtValue,
        liquidationThreshold
      );

      // Should maintain 18 decimal precision
      expect(healthFactor).to.be.gt(0);
      expect(healthFactor).to.be.lt(ethers.constants.MaxUint256);
    });
  });

  describe("Interest Rate Calculation", function () {
    it("Should return base rate when utilization is zero", async function () {
      const totalBorrowed = 0;
      const totalSupply = ethers.utils.parseEther("1000000");
      const baseRate = ethers.utils.parseEther("0.02"); // 2%
      const multiplier = ethers.utils.parseEther("0.1"); // 10%

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      expect(interestRate).to.equal(baseRate);
    });

    it("Should return base rate when total supply is zero", async function () {
      const totalBorrowed = ethers.utils.parseEther("1000");
      const totalSupply = 0;
      const baseRate = ethers.utils.parseEther("0.02");
      const multiplier = ethers.utils.parseEther("0.1");

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      expect(interestRate).to.equal(baseRate);
    });

    it("Should calculate correct rate at 50% utilization", async function () {
      const totalBorrowed = ethers.utils.parseEther("500000");
      const totalSupply = ethers.utils.parseEther("1000000");
      const baseRate = ethers.utils.parseEther("0.02"); // 2%
      const multiplier = ethers.utils.parseEther("0.1"); // 10%

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      // Expected: 2% + (50% * 10%) = 2% + 5% = 7%
      const expected = ethers.utils.parseEther("0.07");
      expect(interestRate).to.equal(expected);
    });

    it("Should calculate correct rate at 100% utilization", async function () {
      const totalBorrowed = ethers.utils.parseEther("1000000");
      const totalSupply = ethers.utils.parseEther("1000000");
      const baseRate = ethers.utils.parseEther("0.02");
      const multiplier = ethers.utils.parseEther("0.1");

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      // Expected: 2% + (100% * 10%) = 12%
      const expected = ethers.utils.parseEther("0.12");
      expect(interestRate).to.equal(expected);
    });

    it("Should handle low utilization rates", async function () {
      const totalBorrowed = ethers.utils.parseEther("10000"); // 1% utilization
      const totalSupply = ethers.utils.parseEther("1000000");
      const baseRate = ethers.utils.parseEther("0.02");
      const multiplier = ethers.utils.parseEther("0.1");

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      // Expected: 2% + (1% * 10%) = 2.1%
      const expected = ethers.utils.parseEther("0.021");
      expect(interestRate).to.equal(expected);
    });

    it("Should handle high utilization rates", async function () {
      const totalBorrowed = ethers.utils.parseEther("950000"); // 95% utilization
      const totalSupply = ethers.utils.parseEther("1000000");
      const baseRate = ethers.utils.parseEther("0.02");
      const multiplier = ethers.utils.parseEther("0.1");

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      // Expected: 2% + (95% * 10%) = 11.5%
      const expected = ethers.utils.parseEther("0.115");
      expect(interestRate).to.equal(expected);
    });

    it("Should work with different base rates", async function () {
      const totalBorrowed = ethers.utils.parseEther("500000");
      const totalSupply = ethers.utils.parseEther("1000000");
      const multiplier = ethers.utils.parseEther("0.1");

      // Test with 1% base rate
      const rate1 = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        ethers.utils.parseEther("0.01"),
        multiplier
      );
      expect(rate1).to.equal(ethers.utils.parseEther("0.06")); // 1% + 5%

      // Test with 5% base rate
      const rate5 = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        ethers.utils.parseEther("0.05"),
        multiplier
      );
      expect(rate5).to.equal(ethers.utils.parseEther("0.10")); // 5% + 5%
    });

    it("Should work with different multipliers", async function () {
      const totalBorrowed = ethers.utils.parseEther("500000");
      const totalSupply = ethers.utils.parseEther("1000000");
      const baseRate = ethers.utils.parseEther("0.02");

      // Test with 5% multiplier
      const rate5 = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        ethers.utils.parseEther("0.05")
      );
      expect(rate5).to.equal(ethers.utils.parseEther("0.045")); // 2% + 2.5%

      // Test with 20% multiplier
      const rate20 = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        ethers.utils.parseEther("0.2")
      );
      expect(rate20).to.equal(ethers.utils.parseEther("0.12")); // 2% + 10%
    });

    it("Should maintain precision with complex values", async function () {
      const totalBorrowed = ethers.utils.parseEther("333333.333333");
      const totalSupply = ethers.utils.parseEther("777777.777777");
      const baseRate = ethers.utils.parseEther("0.0234");
      const multiplier = ethers.utils.parseEther("0.0876");

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      expect(interestRate).to.be.gt(baseRate);
    });
  });

  describe("Liquidation Calculation", function () {
    it("Should calculate liquidation amount equal to debt", async function () {
      const debtValue = ethers.utils.parseEther("1000");
      const liquidationPenalty = 500; // 5%

      const [liquidationAmount, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      expect(liquidationAmount).to.equal(debtValue);
    });

    it("Should calculate correct penalty at 5%", async function () {
      const debtValue = ethers.utils.parseEther("1000");
      const liquidationPenalty = 500; // 5%

      const [, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      const expectedPenalty = ethers.utils.parseEther("50"); // 5% of 1000
      expect(penaltyAmount).to.equal(expectedPenalty);
    });

    it("Should calculate correct penalty at 10%", async function () {
      const debtValue = ethers.utils.parseEther("1000");
      const liquidationPenalty = 1000; // 10%

      const [, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      const expectedPenalty = ethers.utils.parseEther("100");
      expect(penaltyAmount).to.equal(expectedPenalty);
    });

    it("Should handle zero penalty", async function () {
      const debtValue = ethers.utils.parseEther("1000");
      const liquidationPenalty = 0;

      const [liquidationAmount, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      expect(liquidationAmount).to.equal(debtValue);
      expect(penaltyAmount).to.equal(0);
    });

    it("Should handle small debt values", async function () {
      const debtValue = ethers.utils.parseEther("0.001");
      const liquidationPenalty = 500;

      const [liquidationAmount, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      expect(liquidationAmount).to.equal(debtValue);
      expect(penaltyAmount).to.equal(ethers.utils.parseEther("0.00005"));
    });

    it("Should handle large debt values", async function () {
      const debtValue = ethers.utils.parseEther("1000000000"); // 1 billion
      const liquidationPenalty = 500;

      const [liquidationAmount, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      expect(liquidationAmount).to.equal(debtValue);
      expect(penaltyAmount).to.equal(ethers.utils.parseEther("50000000")); // 50 million
    });

    it("Should handle various penalty percentages", async function () {
      const debtValue = ethers.utils.parseEther("1000");

      // 1% penalty
      const [, penalty1] = await riskCalculatorTest.testCalculateLiquidation(debtValue, 100);
      expect(penalty1).to.equal(ethers.utils.parseEther("10"));

      // 7.5% penalty
      const [, penalty75] = await riskCalculatorTest.testCalculateLiquidation(debtValue, 750);
      expect(penalty75).to.equal(ethers.utils.parseEther("75"));

      // 15% penalty
      const [, penalty15] = await riskCalculatorTest.testCalculateLiquidation(debtValue, 1500);
      expect(penalty15).to.equal(ethers.utils.parseEther("150"));
    });

    it("Should maintain precision with complex debt values", async function () {
      const debtValue = ethers.utils.parseEther("1234.56789");
      const liquidationPenalty = 537; // 5.37%

      const [liquidationAmount, penaltyAmount] = await riskCalculatorTest.testCalculateLiquidation(
        debtValue,
        liquidationPenalty
      );

      expect(liquidationAmount).to.equal(debtValue);
      // Penalty should be approximately 66.29...
      expect(penaltyAmount).to.be.gt(ethers.utils.parseEther("66"));
      expect(penaltyAmount).to.be.lt(ethers.utils.parseEther("67"));
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should not overflow with maximum values", async function () {
      const maxValue = ethers.constants.MaxUint256.div(2);
      const liquidationThreshold = 5000; // 50%

      // This should not revert
      await expect(
        riskCalculatorTest.testCalculateHealthFactor(maxValue, maxValue, liquidationThreshold)
      ).to.not.be.reverted;
    });

    it("Should handle precision edge cases in interest rate", async function () {
      const totalBorrowed = 1; // 1 wei
      const totalSupply = ethers.constants.MaxUint256.div(2);
      const baseRate = ethers.utils.parseEther("0.02");
      const multiplier = ethers.utils.parseEther("0.1");

      const interestRate = await riskCalculatorTest.testCalculateInterestRate(
        totalBorrowed,
        totalSupply,
        baseRate,
        multiplier
      );

      // Should be very close to base rate
      expect(interestRate).to.be.gte(baseRate);
    });

    it("Should handle all basis points correctly", async function () {
      const debtValue = ethers.utils.parseEther("10000");

      // Test all common basis point values
      for (let bp = 0; bp <= 10000; bp += 100) {
        const [, penalty] = await riskCalculatorTest.testCalculateLiquidation(debtValue, bp);
        const expectedPenalty = debtValue.mul(bp).div(10000);
        expect(penalty).to.equal(expectedPenalty);
      }
    });
  });
});

// Helper contract for testing library functions
// This would need to be created separately
