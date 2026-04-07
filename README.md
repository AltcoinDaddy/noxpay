# NoxPay — Confidential Payroll & Rewards

> **"Send rewards on-chain with hidden balances and amounts. Powered by iExec Nox & Confidential Tokens."**

![NoxPay Banner](./screenshots/banner.png)

NoxPay is a confidential payroll and rewards platform built for DAOs, protocols, and Web3 teams. The treasury can send payments and rewards while all **individual amounts and recipient balances remain fully encrypted** using iExec Nox and ERC-7984 Confidential Tokens. Recipients see only their own private balance — decrypted client-side via the Nox JS SDK.

---

## 🏆 Built for iExec Vibe Coding Challenge 2026

- **Network:** Arbitrum Sepolia
- **Confidential Layer:** iExec Nox Protocol + ERC-7984 Confidential Tokens
- **Live Demo:** [Coming soon after deployment]

---

## ✨ Features

| Feature | Description |
|---|---|
| **Token Shielding** | Wrap any ERC-20 into its confidential ERC-7984 version |
| **Confidential Payments** | Send rewards with encrypted amounts — only the recipient can decrypt |
| **Batch Payments** | Distribute to multiple recipients in a single transaction |
| **Public Aggregates** | Total distributed visible to everyone; individual amounts hidden |
| **Selective Disclosure** | Grant temporary view access to auditors/compliance officers |
| **Linear Vesting** | Create vesting schedules with confidential balances |
| **Privacy Contrast UI** | Clear visual distinction between public and private data |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ Treasury │  │  Recipient   │  │   Selective    │    │
│  │Dashboard │  │  Dashboard   │  │  Disclosure    │    │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘    │
│       │               │                  │              │
│  ┌────┴───────────────┴──────────────────┴────────────┐ │
│  │            Nox JS SDK (@iexec-nox/handle)           │ │
│  │    encryptInput() · decrypt() · viewACL()           │ │
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

5. **Vesting:** The contract holds confidential tokens and releases them linearly. The `claimVested()` function transfers the vested portion via confidential transfer.

---

## 📁 Project Structure

```
noxpay/
├── contracts/                    # Smart contracts
│   ├── contracts/
│   │   └── NoxPay.sol           # Main contract with Nox integration
│   ├── scripts/
│   │   └── deploy.cjs           # Deployment script
│   ├── hardhat.config.cjs       # Hardhat configuration
│   └── .env.example             # Environment template
│
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx       # Navigation + wallet connect
│   │   │   ├── LandingHero.tsx  # Landing page + features
│   │   │   ├── PublicStats.tsx  # Public aggregate stats
│   │   │   ├── ShieldTokens.tsx # Token wrapping UI
│   │   │   ├── TreasuryDashboard.tsx  # Admin payment interface
│   │   │   ├── RecipientDashboard.tsx # Private balance + history
│   │   │   ├── SelectiveDisclosure.tsx # ACL management
│   │   │   └── Footer.tsx       # Footer with links
│   │   ├── config/
│   │   │   ├── wagmi.ts         # Wagmi + RainbowKit config
│   │   │   └── contracts.ts     # ABIs + addresses
│   │   ├── main.tsx             # Entry point with providers
│   │   ├── App.tsx              # Main app with view routing
│   │   └── index.css            # Design system
│   ├── .env.example             # Frontend env template
│   └── package.json
│
├── README.md                     # This file
├── feedback.md                   # Developer experience feedback
└── screenshots/                  # Demo screenshots
```

---

## 🚀 Getting Started

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
# Edit .env with your private key and RPC URL
```

### 3. Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy.cjs --network arbitrumSepolia
```

Save the deployed contract address from the output.

### 4. Set Up Frontend

```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with deployed contract addresses
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔗 Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| NoxPay | `[Deploy and update]` |
| Confidential Token (ERC-7984) | `[From cdefi.iex.ec]` |
| Underlying ERC-20 | `[USDC on Arbitrum Sepolia]` |

---

## 📸 Screenshots

> Add screenshots after running the app:

1. **Landing Page** — Hero with privacy features and public vs private contrast
2. **Treasury Dashboard** — Single/batch payment and vesting creation
3. **Recipient Dashboard** — Encrypted balance with decrypt button and transaction history
4. **Selective Disclosure** — View access management panel

---

## 🎬 Demo Video Script (4 minutes)

### Scene 1: Introduction (0:00 – 0:30)
- Show landing page with gold & cyan branding
- Explain: "NoxPay is a confidential payroll platform powered by iExec Nox"
- Highlight the public vs private contrast section

### Scene 2: Token Shielding (0:30 – 1:15)
- Connect wallet (MetaMask on Arbitrum Sepolia)
- Navigate to Treasury Mode
- Shield 1000 USDC → Show the 2-step approve + wrap flow
- Highlight: "Balance is now encrypted on-chain"

### Scene 3: Sending Confidential Rewards (1:15 – 2:15)
- Send a single confidential payment to a recipient address
- Show the Nox SDK encrypting the amount (cyan indicator)
- Send a batch payment to 3 recipients
- Show the public aggregate updating while individual amounts stay hidden

### Scene 4: Recipient View (2:15 – 3:15)
- Switch to Recipient Dashboard
- Show encrypted balance ($••,•••.••)
- Click "Decrypt My Balance" — show the Nox TEE decryption flow
- Balance reveals: $8,750.00 in cyan
- Show private transaction history with decrypted amounts

### Scene 5: Selective Disclosure + Wrap-up (3:15 – 4:00)
- Open Selective Disclosure panel
- Grant 24h view access to an auditor address
- Show the ACL grant confirmation
- Recap: "All powered by Nox TEE — plaintext never touches the chain"
- End with the NoxPay tagline

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS v4 |
| Wallet | wagmi v3 · viem v2 · RainbowKit |
| Smart Contracts | Solidity ^0.8.28 · Hardhat |
| Confidential Layer | iExec Nox Protocol · ERC-7984 · @iexec-nox/handle SDK |
| Network | Arbitrum Sepolia (Chain ID: 421614) |
| Animations | Framer Motion |

---

## 📄 License

MIT

---

**Built with 🛡️ by NoxPay Team for the iExec Vibe Coding Challenge 2026**
