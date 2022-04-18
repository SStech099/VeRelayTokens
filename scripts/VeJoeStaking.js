
const hre = require("hardhat");
async function main() {

  const staking = await hre.ethers.getContractFactory("VeJoeStaking");
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


//0x6C3167F948D021F55d2Df3594B21462833b99c2a
