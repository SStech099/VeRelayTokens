const hre = require("hardhat");
async function main() {

  const relay = await hre.ethers.getContractFactory("RelayToken");
  const Relay = await relay.deploy();

  await Relay.deployed();

  console.log("Relay deployed to:", Relay.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
