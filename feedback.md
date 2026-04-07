# NoxPay — Developer Feedback

> Honest feedback on building with iExec Nox, Confidential Tokens, the SDK, wizard, and overall development experience.

---

## 📋 Overall Experience

**Rating: 4/5 — Very promising technology with room for DX improvements**

Building NoxPay with iExec Nox was an exciting experience. The concept of confidential DeFi is compelling, and the technical foundation is solid. The ERC-7984 standard provides a clean abstraction for confidential tokens, and the Nox protocol's use of Intel TDX TEEs offers genuine hardware-backed privacy guarantees.

---

## ✅ What Worked Well

### 1. Documentation Quality
The Nox documentation at `docs.iex.ec/nox-protocol` is well-structured and clearly written. The separation between "Get Started," "Guides," and "References" makes it easy to find what you need. The Hello World guide was particularly helpful for understanding the handle-based architecture.

### 2. Solidity Library Design
The `Nox.*` library pattern (e.g., `Nox.add()`, `Nox.sub()`, `Nox.fromExternal()`) is intuitive and feels natural for Solidity developers. Using encrypted types like `euint256` as custom value types backed by `bytes32` is a clean design. The fact that it "looks like regular Solidity" is a major advantage — low learning curve.

### 3. ERC-7984 Wrapper Pattern
The `ERC20ToERC7984Wrapper` is elegant. The one-step `wrap()` and two-step `unwrap()` + `finalizeUnwrap()` pattern makes sense given the confidentiality constraints. The 1:1 peg with the underlying ERC-20 is easy to reason about.

### 4. JS SDK Simplicity
`@iexec-nox/handle` provides a clean API. The `createViemHandleClient()` factory makes it straightforward to integrate with existing wagmi/viem setups. The encrypt → compute → decrypt workflow is logical.

### 5. ACL-based Access Control
The selective disclosure system via `Nox.allow()`, `Nox.addViewer()`, and `viewACL()` is well-designed. It gives users granular control over who can decrypt their data, which is critical for compliance use cases.

---

## ⚠️ Areas for Improvement

### 1. Contract Deployment Complexity
The Nox protocol requires specific infrastructure (Handle Gateway, Runner, KMS) to be running for encrypted operations to work. This makes local development harder compared to standard Solidity development. A local mock/dev mode that simulates TEE computation would be a significant DX improvement.

**Recommendation:** Provide a `NoxMockRunner` for local Hardhat testing that processes encrypted operations synchronously.

### 2. SDK Documentation Gaps
While the reference documentation exists, there are gaps in end-to-end examples. For instance:
- How to combine `encryptInput()` with a contract call in a single user flow
- How to handle the async nature of TEE computation (waiting for Runner to process)
- Error handling patterns when TEE computation fails

**Recommendation:** Add a "Cookbook" section with complete frontend-to-contract integration examples.

### 3. Limited TypeScript Types
The `@iexec-nox/handle` SDK could benefit from stronger TypeScript types. When working with handles (`bytes32`), the type system doesn't help distinguish between a regular `bytes32` and an encrypted handle. Custom branded types would help.

**Recommendation:** Export branded types like `EncryptedHandle<T>` to improve type safety.

### 4. Unwrap Flow Complexity
The two-step unwrap process (request → finalize with decryption proof) requires coordination between the frontend and the Nox protocol. The documentation could be clearer about:
- How long to wait between steps
- How to poll for decryption readiness
- What happens if finalization fails

**Recommendation:** Provide a helper function in the SDK that wraps the full unwrap lifecycle.

### 5. Testnet Availability
During development, we experienced some latency with the Nox infrastructure on Arbitrum Sepolia. Having a status page or health check endpoint would help developers distinguish between their own bugs and infrastructure issues.

**Recommendation:** Add a `noxClient.healthCheck()` method and a public status page.

---

## 💡 Feature Requests

1. **Batch encryption** — Allow encrypting multiple values in a single SDK call for batch payment flows
2. **Event indexing helpers** — SDK utilities for parsing and decrypting events from transaction receipts
3. **React hooks** — Official `useNoxBalance()`, `useNoxTransfer()` hooks for React integration
4. **Confidential Token factory** — A UI-based wizard for deploying custom ERC-7984 wrappers (similar to OpenZeppelin's wizard)
5. **Gas estimation** — Better gas estimation support for confidential operations

---

## 🎯 Vibe Coding Experience

Using AI-assisted development to build NoxPay was productive. The Nox documentation and SDK are structured well enough that AI tools could understand the patterns and generate correct integration code. The main challenge was the lack of real-time testability — AI-generated contract interactions couldn't be validated without a running Nox infrastructure.

The "vibe coding" approach works best when:
- Documentation has complete, self-contained examples
- SDKs have strong TypeScript types (helps AI understand the API surface)
- There's a fast feedback loop (local testing)

---

## 🏗️ What We Built

NoxPay demonstrates a real-world use case for confidential tokens: **private payroll and rewards**. This addresses a genuine need:
- DAOs need to compensate contributors without revealing individual salaries
- Protocols need to distribute rewards without exposing competitive intelligence
- Teams need compliance compatibility without sacrificing privacy

The ERC-7984 standard and Nox protocol make this possible in a way that wasn't feasible before — encrypted balances with programmatic access control on a public blockchain.

---

**Thank you to the iExec team for building Nox and for organizing this challenge. The technology is genuinely impressive, and we look forward to seeing it mature.**

— NoxPay Team
