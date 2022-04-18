const hre = require("hardhat");
async function main() {

  const joe = await hre.ethers.getContractFactory("JoeToken");
  const Joe = await joe.deploy();

  await Joe.deployed();

  console.log("Joe deployed to:", Joe.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  //0x2321Cd7061aC25750Cb53CD1524B29d3D44Fd4A4