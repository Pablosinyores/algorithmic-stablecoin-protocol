// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title StablecoinToken
 * @notice ERC20 stablecoin with minting/burning controls and emergency pause
 * @dev Implements role-based access control for minting operations
 * 
 * Security Features:
 * - Role-based minting (only MINTER_ROLE can mint)
 * - Pausable for emergency situations
 * - EIP-2612 permit for gasless approvals
 * - Burnable for debt repayment
 * - No owner-controlled supply manipulation
 */
contract StablecoinToken is ERC20, ERC20Burnable, ERC20Permit, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Maximum supply cap to prevent infinite minting
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    /// @notice Emitted when tokens are minted
    event Minted(address indexed to, uint256 amount, address indexed minter);

    /// @notice Emitted when tokens are burned
    event Burned(address indexed from, uint256 amount);

    /**
     * @notice Constructor initializes the stablecoin with name and symbol
     * @param admin Address that will receive DEFAULT_ADMIN_ROLE
     */
    constructor(address admin) 
        ERC20("Algorithmic Stablecoin", "ASTABLE") 
        ERC20Permit("Algorithmic Stablecoin") 
    {
        require(admin != address(0), "Invalid admin address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        // Note: MINTER_ROLE is NOT granted in constructor
        // Must be explicitly granted to VaultManager after deployment
    }

    /**
     * @notice Mints new stablecoin tokens
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     * @dev Only callable by addresses with MINTER_ROLE
     * @dev Enforces MAX_SUPPLY cap
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");

        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }

    /**
     * @notice Burns tokens from caller's balance
     * @param amount Amount of tokens to burn
     * @dev Overrides ERC20Burnable to add event emission
     */
    function burn(uint256 amount) public override whenNotPaused {
        super.burn(amount);
        emit Burned(msg.sender, amount);
    }

    /**
     * @notice Burns tokens from specified address (requires allowance)
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @dev Overrides ERC20Burnable to add event emission
     */
    function burnFrom(address account, uint256 amount) 
        public 
        override 
        whenNotPaused 
    {
        super.burnFrom(account, amount);
        emit Burned(account, amount);
    }

    /**
     * @notice Pauses all token transfers
     * @dev Only callable by addresses with PAUSER_ROLE
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers
     * @dev Only callable by addresses with PAUSER_ROLE
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Hook that is called before any transfer of tokens
     * @dev Prevents transfers when paused
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
