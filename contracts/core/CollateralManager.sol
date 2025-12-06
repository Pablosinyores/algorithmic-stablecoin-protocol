// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CollateralManager
 * @notice Manages multi-asset collateral deposits, withdrawals, and risk assessment
 * @dev Implements checks-effects-interactions pattern and reentrancy protection
 */
contract CollateralManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Collateral configuration for each supported asset
    struct CollateralConfig {
        bool isActive;
        uint256 collateralFactor; // Basis points (10000 = 100%)
        uint256 liquidationThreshold; // Basis points
        uint256 liquidationPenalty; // Basis points
        uint256 minDepositAmount;
        address priceOracle;
    }

    /// @notice User collateral position
    struct CollateralPosition {
        uint256 amount;
        uint256 lastUpdateTimestamp;
        uint256 accruedInterest;
    }

    /// @dev Mapping of collateral token => configuration
    mapping(address => CollateralConfig) public collateralConfigs;

    /// @dev Mapping of user => collateral token => position
    mapping(address => mapping(address => CollateralPosition)) public positions;

    /// @dev Array of supported collateral tokens
    address[] public supportedCollateral;

    /// @notice Emitted when collateral is deposited
    event CollateralDeposited(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when collateral is withdrawn
    event CollateralWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when new collateral type is added
    event CollateralAdded(address indexed token, CollateralConfig config);

    /**
     * @notice Deposits collateral into the protocol
     * @param token Address of the collateral token
     * @param amount Amount to deposit
     */
    function depositCollateral(address token, uint256 amount) 
        external 
        nonReentrant 
    {
        require(collateralConfigs[token].isActive, "Collateral not supported");
        require(amount >= collateralConfigs[token].minDepositAmount, "Below minimum");

        // Effects
        CollateralPosition storage position = positions[msg.sender][token];
        position.amount += amount;
        position.lastUpdateTimestamp = block.timestamp;

        // Interactions
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit CollateralDeposited(msg.sender, token, amount, block.timestamp);
    }

    /**
     * @notice Withdraws collateral from the protocol
     * @param token Address of the collateral token
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(address token, uint256 amount) 
        external 
        nonReentrant 
    {
        CollateralPosition storage position = positions[msg.sender][token];
        require(position.amount >= amount, "Insufficient collateral");

        // TODO: Add health factor check before allowing withdrawal

        // Effects
        position.amount -= amount;
        position.lastUpdateTimestamp = block.timestamp;

        // Interactions
        IERC20(token).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, token, amount, block.timestamp);
    }

    /**
     * @notice Adds a new supported collateral type
     * @param token Address of the collateral token
     * @param config Configuration parameters
     */
    function addCollateral(address token, CollateralConfig memory config) 
        external 
        onlyOwner 
    {
        require(!collateralConfigs[token].isActive, "Already exists");
        require(config.collateralFactor <= 10000, "Invalid factor");
        require(config.liquidationThreshold <= 10000, "Invalid threshold");

        collateralConfigs[token] = config;
        supportedCollateral.push(token);

        emit CollateralAdded(token, config);
    }

    /**
     * @notice Calculates total collateral value in USD for a user
     * @param user Address of the user
     * @return totalValue Total collateral value in USD (18 decimals)
     */
    function getUserCollateralValue(address user) 
        external 
        view 
        returns (uint256 totalValue) 
    {
        // TODO: Implement oracle price aggregation
        // Gas optimization: Cache array length
        uint256 length = supportedCollateral.length;
        
        for (uint256 i = 0; i < length; ) {
            address token = supportedCollateral[i];
            CollateralPosition memory position = positions[user][token];
            
            if (position.amount > 0) {
                // totalValue += getCollateralValueUSD(token, position.amount);
            }
            
            unchecked { ++i; }
        }
    }

    /**
     * @notice Gets user's collateral position for a specific token
     * @param user Address of the user
     * @param token Address of the collateral token
     * @return position The collateral position
     */
    function getPosition(address user, address token) 
        external 
        view 
        returns (CollateralPosition memory) 
    {
        return positions[user][token];
    }

    /**
     * @notice Returns all supported collateral tokens
     * @return Array of collateral token addresses
     */
    function getSupportedCollateral() external view returns (address[] memory) {
        return supportedCollateral;
    }
}
