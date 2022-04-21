const { expect } = require("chai");
const { ethers } = require("hardhat");

let token,veToken,tokenStaking;
let owner,user1,user2,user3,user4;

async function getAddresses() {
  [owner,user1,user2,user3,user4] = await ethers.getSigners();
}

function toWei(n) {
  return ethers.utils.parseEther(n);
}

function toEth(n) {
  return ethers.utils.formatEther(n);
}

async function deploy() {

  const Token = await ethers.getContractFactory("RelayToken");
  token = await Token.deploy();
  await token.deployed();

  const Token2 = await ethers.getContractFactory("VeRelayToken");
  veToken = await Token2.deploy();
  await veToken.deployed();

  const VeRelayStaking = await ethers.getContractFactory("VeRelayStaking");
  tokenStaking = await VeRelayStaking.deploy(token.address, veToken.address, 100, 100, 5, 300, 10000);
  await tokenStaking.deployed();

  await token.transfer(user1.address, 50000);
  await token.transfer(user2.address, 50000);
  await token.transfer(user3.address, 50000);
  await token.transfer(user4.address, 50000);

  await token.connect(user1).approve(tokenStaking.address, 50000);
  await token.connect(user2).approve(tokenStaking.address, 50000);
  await token.connect(user3).approve(tokenStaking.address, 50000);
  await token.connect(user4).approve(tokenStaking.address, 50000);
}

describe("Deploying Contracts", async function() {
  it("Contracts Deployed", async function() {
      await getAddresses();
      await deploy();
  }).timeout("2000s");
});

describe("Check deployments", function() {
  it("Should assign the tokens to user", async function() {
    expect(await token.balanceOf(user1.address)).to.equal(50000);
  });
  it("Should set the right addresses", async function() {
    expect(await tokenStaking.veRelay()).to.equal(veToken.address);
    expect(await tokenStaking.relay()).to.equal(token.address);
  });
  it("Should set the right state variables", async function() {
    expect(await tokenStaking.maxCapPct()).to.equal(10000);
    expect(await tokenStaking.speedUpThreshold()).to.equal(5);
    expect(await tokenStaking.speedUpDuration()).to.equal(300);
    expect(await tokenStaking.veRelayPerSharePerSec()).to.equal(100);
    expect(await tokenStaking.speedUpVeRelayPerSharePerSec()).to.equal(100);
  });
});

describe("Function setMaxCapPct", async function() {
  it("Should be able to set macCapPct", async function() {
    await tokenStaking.setMaxCapPct(12000);
    expect(await tokenStaking.maxCapPct()).to.equal(12000);
  });
  it("Should fail if non owner tries to set set maxCapPct", async function() {
    await expect(tokenStaking.connect(user1).setMaxCapPct(12000)).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it("Should not allow owner to set less maxCapPct value than the current one", async function() {
    await expect(tokenStaking.setMaxCapPct(9000)).to.be.revertedWith("VeRelayStaking: expected new _maxCapPct to be greater than existing maxCapPct");
  });
  it("Should not allow owner to set greater maxCapPct value than upper limit", async function() {
    await expect(tokenStaking.setMaxCapPct(100000000)).to.be.revertedWith("VeRelayStaking: expected new _maxCapPct to be non-zero and <= 10000000");
  });
});

describe("Function setVeRelayPerSharePerSec", async function() {
  it("Should be able to set VeRelayPerSharePerSec", async function() {
    await tokenStaking.setVeRelayPerSharePerSec(1000);
    expect(await tokenStaking.veRelayPerSharePerSec()).to.equal(1000);
  });
  it("Should fail if non owner tries to set set VeRelayPerSharePerSec", async function() {
    await expect(tokenStaking.connect(user1).setVeRelayPerSharePerSec(1000)).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it("Should not allow owner to set less maxCapPct value than the current one", async function() {
    await expect(tokenStaking.setMaxCapPct(9000)).to.be.revertedWith("VeRelayStaking: expected new _maxCapPct to be greater than existing maxCapPct");
  });
  it("Should not allow owner to set greater maxCapPct value than upper limit", async function() {
    await expect(tokenStaking.setMaxCapPct(100000000)).to.be.revertedWith("VeRelayStaking: expected new _maxCapPct to be non-zero and <= 10000000");
  });
});

describe("Function setSpeedUpThreshold", async function() {
  it("Should be able to set SpeedUpThreshold", async function() {
    await tokenStaking.setSpeedUpThreshold(10);
    expect(await tokenStaking.speedUpThreshold()).to.equal(10);
  });
  it("Should fail if non owner tries to set set SpeedUpThreshold", async function() {
    await expect(tokenStaking.connect(user1).setSpeedUpThreshold(10)).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it("Should not allow owner to set SpeedUpThreshold greater than 100", async function() {
    await expect(tokenStaking.setSpeedUpThreshold(110)).to.be.revertedWith("VeRelayStaking: expected _speedUpThreshold to be > 0 and <= 100");
  });
  it("Should not allow owner to set SpeedUpThreshold equal to 0", async function() {
    await expect(tokenStaking.setSpeedUpThreshold(0)).to.be.revertedWith("VeRelayStaking: expected _speedUpThreshold to be > 0 and <= 100");
  });
});

describe("Function Deposit", function() {

  it("Should update the variables after deposit", async function() {
    const beforeUser1Info = await tokenStaking.userInfos(
      user1.address
    );
    expect(beforeUser1Info[0]).to.equal(0);
    expect(beforeUser1Info[1]).to.equal(0);
    expect(beforeUser1Info[2]).to.equal(0);
    expect(beforeUser1Info[3]).to.equal(0);

    // Check joe balance before deposit
    expect(await token.balanceOf(user1.address)).to.equal(50000);

    await tokenStaking.connect(user1).deposit(5000);
    const depositBlock = await ethers.provider.getBlock();

    // Check joe balance after deposit
    expect(await token.balanceOf(user1.address)).to.equal(45000);

    const afterUser1Info = await tokenStaking.userInfos(
      user1.address
    );
    expect(afterUser1Info[0]).to.equal(5000);
    expect(afterUser1Info[1]).to.equal(0);
    expect(afterUser1Info[2]).to.equal(depositBlock.timestamp);
    expect(afterUser1Info[3]).to.equal(
      depositBlock.timestamp + tokenStaking.speedUpDuration);
  });
});

describe("function Withdraw", function () {
  it("Should not execute if the withdraw amount is zero", async function() {
    expect(await tokenStaking.withdraw(0),{
      gasLimit: 10000000,
  }).to.be.revertedWith("VeRelayStaking: expected withdraw amount to be greater than zero");
  });
});
