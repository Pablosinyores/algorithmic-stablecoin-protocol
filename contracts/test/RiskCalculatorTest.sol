// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/RiskCalculator.sol";

/**
 * @title RiskCalculatorTest
 * @notice Test harness contract for RiskCalculator library
 * @dev Exposes library functions for testing purposes
 */
contract RiskCalculatorTest {
    using RiskCalculator for *;

    function testCalculateHealthFactor(
        uint256 collateralValue,
        uint256 debtValue,
        uint256 liquidationThreshold
    ) external pure returns (uint256) {
        return RiskCalculator.calculateHealthFactor(
            collateralValue,
            debtValue,
            liquidationThreshold
        );
    }

    function testCalculateInterestRate(
        uint256 totalBorrowed,
        uint256 totalSupply,
        uint256 baseRate,
        uint256 multiplier
    ) external pure returns (uint256) {
        return RiskCalculator.calculateInterestRate(
            totalBorrowed,
            totalSupply,
            baseRate,
            multiplier
        );
    }

    function testCalculateLiquidation(
        uint256 debtValue,
        uint256 liquidationPenalty
    ) external pure returns (uint256 liquidationAmount, uint256 penaltyAmount) {
        return RiskCalculator.calculateLiquidation(debtValue, liquidationPenalty);
    }
}
