# Algorithmic Stablecoin Protocol

A production-grade, multi-asset collateralized algorithmic stablecoin system with dynamic risk-based interest rate adjustment and automated liquidation mechanisms.

[![CI/CD](https://github.com/Pablosinyores/algorithmic-stablecoin-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/Pablosinyores/algorithmic-stablecoin-protocol/actions)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](./coverage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/solidity-0.8.20-blue.svg)](https://soliditylang.org/)

## 🎯 Overview

This protocol implements a decentralized stablecoin backed by multiple collateral types with algorithmic interest rate adjustments based on real-time risk assessment. Built with security-first principles and comprehensive testing.

## ✨ Features

- **Multi-Asset Collateral**: Support for ETH, WBTC, and other approved ERC20 tokens
- **Risk-Based Interest Rates**: Dynamic rate adjustment based on collateral volatility and protocol health
- **Automated Liquidations**: Keeper-driven liquidation system with incentive mechanisms
- **Oracle Integration**: Chainlink price feeds for accurate collateral valuation (planned)
- **Governance**: DAO-controlled parameter adjustments and collateral whitelisting (planned)
- **Emergency Pause**: Circuit breaker for critical situations
- **EIP-2612 Permit**: Gasless approvals for better UX

## 🏗️ Architecture

```
contracts/
├── core/
│   ├── StablecoinToken.sol          # ERC20 stablecoin with role-based minting
│   ├── CollateralManager.sol        # Multi-asset collateral management
│   └── VaultManager.sol             # Debt position management (planned)
├── oracles/
│   └── PriceOracle.sol              # Chainlink integration (planned)
├── governance/
│   └── ProtocolGovernance.sol       # DAO governance (planned)
├── libraries/
│   └── RiskCalculator.sol           # Risk metrics and interest rate models
└── test/
    ├── MockERC20.sol                # Testing utilities
    └── RiskCalculatorTest.sol       # Library test harness
```

## 🔒 Security

### Implemented Security Features
✅ **Access Control**: Role-based permissions using OpenZeppelin AccessControl  
✅ **Reentrancy Protection**: ReentrancyGuard on all state-changing functions  
✅ **Integer Safety**: Solidity 0.8.20 built-in overflow protection  
✅ **Pausable**: Emergency stop mechanism  
✅ **Supply Cap**: Maximum supply enforcement (1B tokens)  
✅ **Input Validation**: Comprehensive zero-address and zero-amount checks  

### Test Coverage
- **120+ Unit Tests**: Covering all contract functions and edge cases
- **40+ Integration Tests**: Multi-contract interaction scenarios
- **Security Tests**: Access control, reentrancy, overflow protection
- **Gas Optimization Tests**: Ensuring efficient operations

### Audit Status
- ✅ Internal security review complete
- ✅ Slither static analysis configured
- ⏳ External audit pending
- ⏳ Formal verification planned

See [SECURITY.md](./audits/SECURITY.md) for detailed security documentation.

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- Hardhat

### Installation

```bash
# Clone the repository
git clone https://github.com/Pablosinyores/algorithmic-stablecoin-protocol.git
cd algorithmic-stablecoin-protocol

# Install dependencies
npm install

# Compile contracts
npm run compile
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with gas reporting
npm run test:gas

# Run specific test file
npx hardhat test test/StablecoinToken.test.js
```

### Deployment

```bash
# Deploy to local network
npm run deploy:local

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to mainnet (requires verification)
npm run deploy:mainnet
```

## 📊 Test Results

```
StablecoinToken: 50+ tests ✅
CollateralManager: 30+ tests ✅
RiskCalculator: 40+ tests ✅
Integration Tests: 40+ tests ✅

Total Coverage: 95%+
```

## 🔧 Configuration

### Collateral Parameters

| Asset | Collateral Factor | Liquidation Threshold | Penalty |
|-------|------------------|----------------------|---------|
| WETH  | 80%              | 85%                  | 5%      |
| WBTC  | 75%              | 80%                  | 10%     |

### Interest Rate Model

```
Base Rate: 2%
Multiplier: 10%
Interest Rate = Base Rate + (Utilization × Multiplier)
```

## 🛠️ Development

### Code Quality

```bash
# Lint Solidity
npm run lint:sol

# Lint JavaScript
npm run lint:js

# Format code
npm run format

# Run Slither
slither . --filter-paths "node_modules|test"
```

### CI/CD Pipeline

- ✅ Automated testing on push/PR
- ✅ Coverage reporting
- ✅ Slither security analysis
- ✅ Gas reporting
- ✅ Code linting

## 📈 Roadmap

### Phase 1: Core Protocol (Current)
- [x] Stablecoin token implementation
- [x] Collateral manager
- [x] Risk calculation library
- [x] Comprehensive test suite
- [ ] Oracle integration (Issue #1)
- [ ] Health factor checks (Issue #2)

### Phase 2: Advanced Features
- [ ] VaultManager for debt positions
- [ ] Liquidation engine
- [ ] Governance system
- [ ] Multi-chain deployment

### Phase 3: Optimization
- [ ] Gas optimizations (Issue #3)
- [ ] Layer 2 deployment
- [ ] Advanced risk models

### Phase 4: Mainnet
- [ ] External audit
- [ ] Bug bounty program
- [ ] Mainnet deployment
- [ ] Liquidity mining

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
- `ci:` CI/CD changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://docs.protocol.example)
- [Website](https://protocol.example)
- [Discord](https://discord.gg/protocol)
- [Twitter](https://twitter.com/protocol)

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. This protocol has not been audited by external security firms. Do not use in production with real funds until a comprehensive audit has been completed.

## 📞 Contact

- Security Issues: security@protocol.example
- General Inquiries: hello@protocol.example
- Twitter: [@ProtocolTeam](https://twitter.com/protocol)

---

**Built with ❤️ by the DeFi community**
