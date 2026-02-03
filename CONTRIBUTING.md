# Contributing to Qi Agent SDK

Thanks for your interest in contributing! This SDK enables AI agents to send and receive Qi on Quai Network.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Build the project:**
   ```bash
   npm run build
   ```

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Access to Quai Network RPC (mainnet or testnet)

### Environment
Create a `.env` file for local testing (never commit this):
```
MNEMONIC=your test wallet mnemonic
RPC_URL=https://rpc.quai.network
```

### Running Tests
```bash
npm test
```

## Code Style

- **TypeScript** — all source code must be typed
- **Async/await** — prefer over raw Promises
- **Error handling** — always handle errors gracefully, never swallow them silently
- **Comments** — document public APIs with JSDoc comments

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for classes and interfaces
- `UPPER_SNAKE_CASE` for constants

## Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with clear, atomic commits

3. **Write/update tests** for any new functionality

4. **Update documentation** if you've changed APIs

5. **Run the build** to ensure everything compiles:
   ```bash
   npm run build
   ```

6. **Submit a PR** with:
   - Clear title describing the change
   - Description of what and why
   - Link to any related issues

### Commit Messages

Follow conventional commits:
```
feat: add support for cross-zone transfers
fix: handle empty UTXO set gracefully
docs: update README with new examples
refactor: simplify mailbox notification flow
```

## Architecture Overview

```
src/
├── wallet.ts      # QiAgentWallet - main entry point
├── mailbox.ts     # MailboxClient - BIP47 sender discovery
├── types.ts       # TypeScript interfaces and configs
└── index.ts       # Public exports
```

### Key Concepts

- **QiAgentWallet** — High-level wrapper around QiHDWallet for agent use cases
- **BIP47 Payment Codes** — Privacy-preserving addresses (fresh address per tx)
- **Mailbox Contract** — On-chain registry for sender discovery (replaces OP_RETURN)
- **UTXO Model** — Qi uses UTXOs, not account balances

## Reporting Issues

When filing an issue, include:
- Node.js version
- SDK version
- Network (mainnet/testnet)
- Minimal reproduction steps
- Error messages and stack traces

## Security

**Do not** open public issues for security vulnerabilities. Email security concerns directly to the maintainers.

Never commit:
- Mnemonics or private keys
- API keys or secrets
- Personal wallet addresses with real funds

## Questions?

- Open a GitHub Discussion for general questions
- Join the [Quai Discord](https://discord.gg/quai) for community support

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
