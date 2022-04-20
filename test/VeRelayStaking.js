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
  tokenStaking = await VeRelayStaking.deploy(token.address, veToken.address, 100, 100, 100, 300, 10000);
  await tokenStaking.deployed();

  await token.transfer(user1.address, 50000);
  await token.transfer(user2.address, 50000);
  await token.transfer(user3.address, 50000);
  await token.transfer(user4.address, 50000);
}

describe("Deploying Contracts", async() => {
  it("Contracts Deployed", async() => {
      await getAddresses();
      await deploy();
  }).timeout("150s");
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
    expect(await tokenStaking.speedUpThreshold()).to.equal(100);
    expect(await tokenStaking.speedUpDuration()).to.equal(300);
    expect(await tokenStaking.veRelayPerSharePerSec()).to.equal(100);
    expect(await tokenStaking.speedUpVeRelayPerSharePerSec()).to.equal(100);
  });
});

describe("Function testing", function() {
  
});
