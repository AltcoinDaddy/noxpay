import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Deploying NoxPay...");
  
  const rpc = process.env.ARB_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";
  const provider = new ethers.JsonRpcProvider(rpc);
  
  let privateKey = process.env.PRIVATE_KEY.trim();
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
  
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with account:", wallet.address);
  console.log("Account balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH\n");

  let CONFIDENTIAL_TOKEN_ADDRESS = process.env.NOX_CONFIDENTIAL_TOKEN_FACTORY;
  if (!CONFIDENTIAL_TOKEN_ADDRESS || CONFIDENTIAL_TOKEN_ADDRESS === "0x...") CONFIDENTIAL_TOKEN_ADDRESS = "0x7890bf57fb99f13ef73bc4fbffb7373f28564a93";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || wallet.address;

  console.log("Confidential Token (Mock):", CONFIDENTIAL_TOKEN_ADDRESS);
  const UNDERLYING_TOKEN_ADDRESS = process.env.VITE_UNDERLYING_TOKEN_ADDRESS || "0x98ea123472023cb2bc815b804bb0ed7903bd8111";
  console.log("Underlying Token:", UNDERLYING_TOKEN_ADDRESS);
  console.log("Treasury Address:", TREASURY_ADDRESS);
  console.log("");

  // Read ABI and Bytecode from compiled artifact
  const artifactPath = "./artifacts/contracts/NoxPay.sol/NoxPay.json";
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  const contract = await factory.deploy(CONFIDENTIAL_TOKEN_ADDRESS, UNDERLYING_TOKEN_ADDRESS, TREASURY_ADDRESS);
  console.log("Tx hash:", contract.deploymentTransaction().hash);
  await contract.waitForDeployment();
  
  const noxpayAddress = await contract.getAddress();
  
  console.log("✅ NoxPay deployed to:", noxpayAddress);
  console.log("");
  
  console.log("═══════════════════════════════════════");
  console.log("       DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`NoxPay Contract:     ${noxpayAddress}`);
  console.log(`Confidential Token:  ${CONFIDENTIAL_TOKEN_ADDRESS}`);
  console.log(`Treasury:            ${TREASURY_ADDRESS}`);
  console.log("═══════════════════════════════════════\n");

  console.log("🎉 Deployment complete! Update your frontend .env with:");
  console.log(`VITE_NOXPAY_ADDRESS=${noxpayAddress}`);
}

main().catch(console.error);
