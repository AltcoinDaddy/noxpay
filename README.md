# NoxPay — Confidential Payroll & Rewards

> "Send rewards on-chain with hidden balances and amounts. Powered by iExec Nox & Confidential Tokens."

![NoxPay Banner](./screenshots/banner.png)

NoxPay is a confidential payroll and rewards platform built for DAOs, protocols, and Web3 teams. The treasury can send payments and rewards while all **individual amounts and recipient balances remain fully encrypted** using iExec Nox and ERC-7984 Confidential Tokens. Recipients see only their own private balance — decrypted client-side via the Nox JS SDK.

---

## Features

| Feature | Description |
|---|---|
| **Token Shielding** | Wrap any ERC-20 into its confidential ERC-7984 version |
| **Token Unshielding** | Initiate unwrap requests from the UI; finalize the real Nox unwrap with a decryption proof |
| **Confidential Payments** | Send rewards with encrypted amounts — only the recipient can decrypt |
| **Batch Payments** | Distribute to multiple recipients in a single transaction |
| **Public Aggregates** | Total distributed visible to everyone; individual amounts hidden |
| **Selective Disclosure** | Grant temporary view access to auditors/compliance officers |
| **Linear Vesting** | Create vesting schedules with confidential balances |
| **Privacy Contrast UI** | Clear visual distinction between public and private data |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │ Treasury │  │  Recipient   │  │   Selective    │     │
│  │Dashboard │  │  Dashboard   │  │  Disclosure    │     │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘     │
│       │               │                  │              │
│  ┌────┴───────────────┴──────────────────┴────────────┐ │
│  │            Nox JS SDK (@iexec-nox/handle)          │ │
│  │    encryptInput() · decrypt() · viewACL()          │ │
│  └────────────────────────┬────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │   Arbitrum Sepolia │
                  │  ┌──────────────┐  │
                  │  │  NoxPay.sol  │  │
                  │  └──────┬───────┘  │
                  │         │          │
                  │  ┌──────┴───────┐  │
                  │  │ Confidential │  │
                  │  │   Token      │  │
                  │  │ (ERC-7984)   │  │
                  │  └──────┬───────┘  │
                  │         │          │
                  │  ┌──────┴───────┐  │
                  │  │  Nox TEE     │  │
                  │  │  (Intel TDX) │  │
                  │  └──────────────┘  │
                  └────────────────────┘
```

### How Nox & Confidential Tokens Are Used

1. **Token Shielding (Wrap):** Users call `NoxPay.shieldTokens()` which approves and `wrap()`s their ERC-20 into an ERC-7984 Confidential Token. The balance becomes an encrypted handle on-chain.

2. **Encrypted Payments:** The treasury uses the Nox JS SDK's `encryptInput()` to encrypt the payment amount client-side. The encrypted handle + proof are sent to `sendConfidentialReward()` which calls `confidentialTransfer()` on the ERC-7984 token. All computation happens inside Intel TDX TEEs.

3. **Balance Decryption:** Recipients use `handleClient.decrypt(balanceHandle)` from the JS SDK. The SDK signs an EIP-712 authorization, the on-chain ACL verifies permission, and the plaintext is returned securely — never exposed on-chain.

4. **Selective Disclosure:** Users call `grantViewAccess()` which invokes `addViewer()` on the confidential token's ACL. The auditor can then decrypt the user's balance handle for a limited time.

5. **Vesting:** The contract holds confidential tokens and releases them linearly. The `claimVested()` function transfers the vested portion via confidential transfer securely.

---

## Project Structure

```text
noxpay/
├── contracts/                    # Smart contracts
│   ├── contracts/
│   │   ├── NoxPay.sol           # Main contract with Nox integration
│   │   ├── MockTokens.sol       # Underlying mock token for test funding
│   │   └── WrappedConfidentialToken.sol # Real Nox ERC-20 → ERC-7984 wrapper
│   ├── scripts/
│   │   ├── deployRealSetupEthers.js # Deploy real Nox wrapper + NoxPay
│   │   └── deployMockSetupEthers.js # Backward-compatible alias to the real deploy flow
│   ├── hardhat.config.js        # Hardhat configuration
│   └── .env.example             # Environment template
│
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # Standard Treasury/Recipient/Shared UI blocks
│   │   ├── config/              # Wagmi configs and addresses
│   │   ├── hooks/               # Metadata logic
│   │   ├── main.tsx             
│   │   ├── App.tsx              
│   │   └── index.css            
│   ├── .env.example             
│   └── package.json
│
├── README.md                     # This file
├── feedback.md                   # Developer experience feedback
└── screenshots/                  # Demo screenshots
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or any Ethereum wallet
- Arbitrum Sepolia testnet ETH ([faucet](https://faucets.chain.link/arbitrum-sepolia))

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/noxpay.git
cd noxpay
```

### 2. Set Up Smart Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Edit .env with your private key (PRIVATE_KEY=...)
```

### 3. Deploy to Arbitrum Sepolia

```bash
npx hardhat compile
node scripts/deployRealSetupEthers.js
```
This deploys a real iExec Nox ERC-20 wrapper and then deploys `NoxPay` against it. If `UNDERLYING_TOKEN_ADDRESS` is empty, the script first deploys a `MockUSDC` test token and wraps that. The script also updates [frontend/.env.local](./frontend/.env.local) with the new addresses.

Before treasury payouts or vesting transfers will work, the treasury wallet must grant `NoxPay` operator rights on the confidential token:

```text
setOperator(<noxpay-address>, <future-unix-timestamp>)
```

Call that on the deployed `WrappedConfidentialToken` contract from the treasury wallet.

### 4. Running the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Important Notes

- Real Nox balance handles now come from the official wrapper, so recipient decryption can work correctly on Arbitrum Sepolia.
- The unshield UI still submits the first `unwrap()` transaction only. Real wrappers require a later `finalizeUnwrap()` call with a decryption proof, so full unshield automation is still a follow-up item.
- Selective disclosure still assumes contract-managed ACL updates. Real Nox viewer ACLs are tied to the underlying handle admin model, so that flow needs a dedicated follow-up before it is production-ready.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS v4 |
| Wallet | wagmi v3 · viem v2 · RainbowKit |
| Smart Contracts | Solidity ^0.8.28 · Hardhat · Ethers v6 |
| Confidential Layer | iExec Nox Protocol · ERC-7984 · @iexec-nox/handle SDK |
| Network | Arbitrum Sepolia (Chain ID: 421614) |
| Animations | Framer Motion |

---

## License

MIT
