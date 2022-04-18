
const hre = require("hardhat");
async function main() {

  const boost = await hre.ethers.getContractFactory("BoostedMasterChefJoe");
  const Boost = await boost.deploy();

  await Boost.deployed();

  console.log("Greeter deployed to:", Boost.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
