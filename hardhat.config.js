require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const { mnemonic } = require('./secrets.json');

module.exports = {
    defaultNetwork: "fujiTestnet",
  networks: {
    fujiTestnet: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      gasPrice: 25000000000,
      accounts: {mnemonic: mnemonic}
    },
  },
        etherscan: {
          apiKey: {
            avalancheFujiTestnet: "S2EI1WDSF6HFZIDYWRJF2I5M38UXRRE4G9"
          },
        },
        solidity: {
          compilers: [{
                  version: "0.6.12",
                  settings: {
                      optimizer: {
                          enabled: true,
                          runs: 200,
                      },
                  },
              },
              {
                  version: "0.7.6",
                  settings: {
                      optimizer: {
                          enabled: true,
                          runs: 999999,
                      },
                  },
              },
              // {
              //     version: "0.8.7",
              //     settings: {
              //         optimizer: {
              //             enabled: true,
              //             runs: 200,
              //         },
              //     },
              // },
          ],
      },
};
