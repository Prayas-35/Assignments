const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const CertificateRegistry = await hre.ethers.getContractFactory('CertificateRegistry');
  const registry = await CertificateRegistry.deploy(deployer.address);

  await registry.waitForDeployment();

  console.log('CertificateRegistry deployed to:', registry.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
