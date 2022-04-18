
const hre = require("hardhat");
async function main() {

  const staking = await hre.ethers.getContractFactory("VeRelayStaking");
  const VeStaking = await staking.deploy();

  await VeStaking.deployed();

  console.log("Staking deployed to:", VeStaking.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

