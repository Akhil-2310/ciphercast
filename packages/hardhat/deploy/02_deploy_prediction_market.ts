import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys FHEPredictionMarket and AUSDFaucet contracts
 *
 * Note: These contracts require:
 * - A shielded stablecoin (AUSD) to be deployed first for FUSD markets
 * - Chainlink price feeds for market resolution
 */
const deployPredictionMarket: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // For testing, we'll use a placeholder address for the shielded stablecoin
  // In production, this should be the actual AUSD/FUSD contract address
  const AUSD_ADDRESS = "0x75980803748f325b7274c9b68e87cbc2f9e8b357";

  // Deploy AUSDFaucet first (if AUSD contract exists)
  await deploy("AUSDFaucet", {
    from: deployer,
    args: [AUSD_ADDRESS],
    log: true,
    autoMine: true,
  });

  // Deploy FHEPredictionMarket
  await deploy("FHEPredictionMarket", {
    from: deployer,
    args: [AUSD_ADDRESS],
    log: true,
    autoMine: true,
  });

  console.log("✅ FHEPredictionMarket deployed");
  console.log("✅ AUSDFaucet deployed");
  console.log("📍 Using AUSD address:", AUSD_ADDRESS);
};

export default deployPredictionMarket;

deployPredictionMarket.tags = ["FHEPredictionMarket", "AUSDFaucet"];
