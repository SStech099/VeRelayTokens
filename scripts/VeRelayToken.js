
const hre = require("hardhat");
async function main() {

  const veRelay = await hre.ethers.getContractFactory("VeRelayToken");
  const VeRelay = await veRelay.deploy();

  await VeRelay.deployed();

  console.log("VeRelay deployed to:", VeRelay.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
