import { ethers } from "hardhat";
import deployment from "../deployments/sepolia/FHEPredictionMarket.json";

/**
 * Auto-Settlement Script
 *
 * Checks all markets and automatically settles any that are:
 * 1. Past their close time but not resolved → resolveWithChainlink
 * 2. Resolved but decrypt not requested → requestDecrypt
 * 3. Decrypt requested but not settled → settleMarket
 *
 * Run: npx hardhat run scripts/auto-settle.ts --network sepolia
 * Automate: Run via cron every 5 minutes
 */

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`⚙️  Auto-settler running as: ${signer.address}`);

  // Get the deployed contract
  const contract = new ethers.Contract(deployment.address, deployment.abi, signer);

  const marketCount = await contract.marketCounter();
  console.log(`📊 Total markets: ${marketCount}`);

  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < Number(marketCount); i++) {
    const market = await contract.markets(i);

    // Market struct fields:
    // 0: question, 1: closeTime, 2: feeBps, 3: currency,
    // 4: priceFeed, 5: priceThreshold, 6: outcomeReported,
    // 7: winningOutcome, ..., 17: decryptRequested, 18: resolvedPrice, 19: settled
    const question = market[0];
    const closeTime = Number(market[1]);
    const outcomeReported = market[6];
    const decryptRequested = market[17];
    const settled = market[19];

    console.log(`\n── Market ${i}: "${question}"`);
    console.log(`   Close: ${new Date(closeTime * 1000).toISOString()}`);
    console.log(`   Status: reported=${outcomeReported}, decryptReq=${decryptRequested}, settled=${settled}`);

    // Skip if already settled
    if (settled) {
      console.log(`   ✅ Already settled, skipping`);
      continue;
    }

    // Skip if market hasn't closed yet
    if (now < closeTime) {
      console.log(`   ⏳ Not closed yet (closes in ${Math.round((closeTime - now) / 60)} min)`);
      continue;
    }

    // Step 1: Resolve with Chainlink if not yet reported
    if (!outcomeReported) {
      console.log(`   🔄 Step 1: Resolving with Chainlink...`);
      try {
        const tx = await contract.resolveWithChainlink(i);
        await tx.wait();
        console.log(`   ✅ Resolved! tx: ${tx.hash}`);
      } catch (e: any) {
        console.error(`   ❌ Resolve failed: ${e.message}`);
        continue;
      }
    }

    // Step 2: Request decrypt if not yet requested
    const marketAfterResolve = await contract.markets(i);
    const decryptRequestedNow = marketAfterResolve[17];

    if (!decryptRequestedNow) {
      console.log(`   🔄 Step 2: Requesting pool decrypt...`);
      try {
        const tx = await contract.requestDecrypt(i);
        await tx.wait();
        console.log(`   ✅ Decrypt requested! tx: ${tx.hash}`);
      } catch (e: any) {
        console.error(`   ❌ Request decrypt failed: ${e.message}`);
        continue;
      }
    }

    // Step 3: Try to settle (might fail if decrypt isn't ready yet)
    console.log(`   🔄 Step 3: Attempting to settle (decrypt may need ~30s)...`);

    // Wait a bit for FHE decryption to complete
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const tx = await contract.settleMarket(i);
        await tx.wait();
        console.log(`   ✅ Settled! tx: ${tx.hash}`);
        break;
      } catch (e: any) {
        if (attempt < maxAttempts && e.message.includes("pending")) {
          console.log(`   ⏳ Decrypt not ready, waiting 10s... (attempt ${attempt}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, 10000));
        } else {
          console.error(`   ❌ Settle failed: ${e.message}`);
          break;
        }
      }
    }
  }

  console.log(`\n🏁 Auto-settlement complete!`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
