import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying Mock Setup to Arbitrum Sepolia using vanilla Ethers...");
  console.log("=================================================================\n");

  const rpc = process.env.ARB_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";
  const provider = new ethers.JsonRpcProvider(rpc);
  
  let privateKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
  
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying with account:", wallet.address);
  console.log("Account balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH\n");

  // 1. Deploy Mock USDC
  console.log("Deploying MockUSDC...");
  const usdcArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/MockTokens.sol/MockUSDC.json", "utf8"));
  const usdcFactory = new ethers.ContractFactory(usdcArtifact.abi, usdcArtifact.bytecode, wallet);
  const usdc = await usdcFactory.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);

  // 2. Deploy Mock Confidential Token
  console.log("\nDeploying MockConfidentialToken...");
  const confArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/MockTokens.sol/MockConfidentialToken.json", "utf8"));
  const confFactory = new ethers.ContractFactory(confArtifact.abi, confArtifact.bytecode, wallet);
  const confToken = await confFactory.deploy(usdcAddress);
  await confToken.waitForDeployment();
  const confAddress = await confToken.getAddress();
  console.log("✅ MockConfidentialToken deployed to:", confAddress);

  // 3. Deploy NoxPay
  console.log("\nDeploying NoxPay...");
  const TREASURY_ADDRESS = wallet.address;
  const noxArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/NoxPay.sol/NoxPay.json", "utf8"));
  const noxFactory = new ethers.ContractFactory(noxArtifact.abi, noxArtifact.bytecode, wallet);
  const noxpay = await noxFactory.deploy(confAddress, usdcAddress, TREASURY_ADDRESS);
  await noxpay.waitForDeployment();
  const noxpayAddress = await noxpay.getAddress();
  console.log("✅ NoxPay deployed to:", noxpayAddress);

  // 4. Update Frontend .env.local
  console.log("\nUpdating Frontend ENV...");
  const envPath = path.resolve(__dirname, '../../frontend/.env.local');
  const envContent = `VITE_NOXPAY_ADDRESS="${noxpayAddress}"\nVITE_CONFIDENTIAL_TOKEN_ADDRESS="${confAddress}"\nVITE_UNDERLYING_TOKEN_ADDRESS="${usdcAddress}"\nVITE_WALLETCONNECT_PROJECT_ID="d3b5bdfb04d1c0a0c"\n`;
  fs.writeFileSync(envPath, envContent);
  console.log("✅ Updated frontend/.env.local matches live deploy on Sepolia!");

  // Verify Summary
  console.log("\n═══════════════════════════════════════");
  console.log("       DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`MockUSDC:            ${usdcAddress}`);
  console.log(`Confidential Token:  ${confAddress}`);
  console.log(`NoxPay Contract:     ${noxpayAddress}`);
  console.log(`Treasury Address:    ${TREASURY_ADDRESS}`);
  console.log("═══════════════════════════════════════\n");
}

main().catch(console.error);
