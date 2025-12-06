// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RiskCalculator
 * @notice Library for calculating risk metrics and health factors
 * @dev Uses fixed-point arithmetic for precision
 */
library RiskCalculator {
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;

    /**
     * @notice Calculates the health factor for a position
     * @param collateralValue Total collateral value in USD
     * @param debtValue Total debt value in USD
     * @param liquidationThreshold Liquidation threshold in basis points
     * @return healthFactor The health factor (1e18 = 100%)
     */
    function calculateHealthFactor(
        uint256 collateralValue,
        uint256 debtValue,
        uint256 liquidationThreshold
    ) internal pure returns (uint256 healthFactor) {
        if (debtValue == 0) return type(uint256).max;
        
        uint256 adjustedCollateral = (collateralValue * liquidationThreshold) / BASIS_POINTS;
        healthFactor = (adjustedCollateral * PRECISION) / debtValue;
    }

    /**
     * @notice Calculates dynamic interest rate based on utilization
     * @param totalBorrowed Total amount borrowed
     * @param totalSupply Total supply available
     * @param baseRate Base interest rate
     * @param multiplier Rate multiplier
     * @return interestRate The calculated interest rate
     */
    function calculateInterestRate(
        uint256 totalBorrowed,
        uint256 totalSupply,
        uint256 baseRate,
        uint256 multiplier
    ) internal pure returns (uint256 interestRate) {
        if (totalSupply == 0) return baseRate;
        
        uint256 utilization = (totalBorrowed * PRECISION) / totalSupply;
        interestRate = baseRate + (utilization * multiplier) / PRECISION;
    }

    /**
     * @notice Calculates liquidation amount and penalty
     * @param debtValue Total debt value
     * @param liquidationPenalty Penalty in basis points
     * @return liquidationAmount Amount to liquidate
     * @return penaltyAmount Penalty amount
     */
    function calculateLiquidation(
        uint256 debtValue,
        uint256 liquidationPenalty
    ) internal pure returns (uint256 liquidationAmount, uint256 penaltyAmount) {
        liquidationAmount = debtValue;
        penaltyAmount = (debtValue * liquidationPenalty) / BASIS_POINTS;
    }
}
