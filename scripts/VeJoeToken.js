
const hre = require("hardhat");
async function main() {

  const erc20 = await hre.ethers.getContractFactory("VeJoeToken");
  const verc20 = await erc20.deploy();

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


//0xCd1F709744b9A5Bd7FD65E310DA60E1AD3aF08E5