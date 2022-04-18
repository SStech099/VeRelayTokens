
const hre = require("hardhat");
async function main() {

  const erc20 = await hre.ethers.getContractFactory("VeERC20");
  const verc20 = await erc20.deploy("veTest0 token", "VTT");

  await verc20.deployed();

  console.log("Greeter deployed to:", verc20.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
