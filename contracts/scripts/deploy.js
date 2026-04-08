import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying NoxPay against an existing Nox wrapper...");
  console.log("=====================================================\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // ─── Configuration ────────────────────────────────────────
  const CONFIDENTIAL_TOKEN_ADDRESS =
    process.env.CONFIDENTIAL_TOKEN_ADDRESS ||
    process.env.VITE_CONFIDENTIAL_TOKEN_ADDRESS ||
    "0x0000000000000000000000000000000000000000";
  const UNDERLYING_TOKEN_ADDRESS =
    process.env.UNDERLYING_TOKEN_ADDRESS ||
    process.env.VITE_UNDERLYING_TOKEN_ADDRESS ||
    "0x0000000000000000000000000000000000000000";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  if (CONFIDENTIAL_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Missing CONFIDENTIAL_TOKEN_ADDRESS or VITE_CONFIDENTIAL_TOKEN_ADDRESS");
  }
  if (UNDERLYING_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Missing UNDERLYING_TOKEN_ADDRESS or VITE_UNDERLYING_TOKEN_ADDRESS");
  }

  console.log("Confidential Token:", CONFIDENTIAL_TOKEN_ADDRESS);
  console.log("Underlying Token:", UNDERLYING_TOKEN_ADDRESS);
  console.log("Treasury Address:", TREASURY_ADDRESS);
  console.log("");

  // ─── Deploy NoxPay ────────────────────────────────────────
  const NoxPay = await hre.ethers.getContractFactory("NoxPay");
  const noxpay = await NoxPay.deploy(CONFIDENTIAL_TOKEN_ADDRESS, UNDERLYING_TOKEN_ADDRESS, TREASURY_ADDRESS);
  await noxpay.waitForDeployment();

  const noxpayAddress = await noxpay.getAddress();
  console.log("✅ NoxPay deployed to:", noxpayAddress);
  console.log("");

  // ─── Verify Summary ──────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("       DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`NoxPay Contract:     ${noxpayAddress}`);
  console.log(`Confidential Token:  ${CONFIDENTIAL_TOKEN_ADDRESS}`);
  console.log(`Underlying Token:    ${UNDERLYING_TOKEN_ADDRESS}`);
  console.log(`Treasury:            ${TREASURY_ADDRESS}`);
  console.log(`Network:             ${(await deployer.provider.getNetwork()).name}`);
  console.log(`Chain ID:            ${(await deployer.provider.getNetwork()).chainId}`);
  console.log("═══════════════════════════════════════\n");

  console.log("🎉 Deployment complete! Update your frontend .env with:");
  console.log(`VITE_NOXPAY_ADDRESS=${noxpayAddress}`);
  console.log(
    `Reminder: the treasury must call setOperator(${noxpayAddress}, <future timestamp>) on ${CONFIDENTIAL_TOKEN_ADDRESS}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
