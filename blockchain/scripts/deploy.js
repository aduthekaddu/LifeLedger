const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying MedicalRecordAudit contract...");
  
  const MedicalRecordAudit = await hre.ethers.getContractFactory("MedicalRecordAudit");
  const contract = await MedicalRecordAudit.deploy();
  
  // Wait for deployment to complete (new syntax for Hardhat v2.19+)
  await contract.waitForDeployment();
  
  // Get contract address (new syntax)
  const contractAddress = await contract.getAddress();
  
  console.log("✅ MedicalRecordAudit deployed to:", contractAddress);
  
  // Save contract address and ABI
  const deploymentInfo = {
    address: contractAddress,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    abi: JSON.parse(contract.interface.formatJson())
  };
  
  const deploymentPath = path.join(__dirname, '../deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("📝 Deployment info saved to:", deploymentPath);
  console.log("\n🔑 Add this to your backend/.env file:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`BLOCKCHAIN_RPC=http://localhost:8545`);
  
  // Authorize the deployer
  console.log("\n🔐 Authorizing deployer address...");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
