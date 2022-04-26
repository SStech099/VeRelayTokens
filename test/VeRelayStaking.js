const { expect } = require("chai");
const { ethers } = require("hardhat");

function toWei(n) {
  return ethers.utils.parseEther(n);
}

function toEth(n) {
  return ethers.utils.formatEther(n);
}

describe("Deployments", function () {

  let token,veToken,tokenStaking;
  let owner,user1,user2,user3,user4;

  beforeEach(async function() {

    [owner,user1,user2,user3,user4] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("RelayToken");
    token = await Token.deploy();
    await token.deployed();
  
    const Token2 = await ethers.getContractFactory("VeRelayToken");
    veToken = await Token2.deploy();
    await veToken.deployed();
  
    const VeRelayStaking = await ethers.getContractFactory("VeRelayStaking");
    const _VeRelayPerSharePerSec = toWei("1");
    const _speedUpVeRelayPerSharePerSec = toWei("1"); 
    tokenStaking = await VeRelayStaking.deploy(token.address, veToken.address, _VeRelayPerSharePerSec, _speedUpVeRelayPerSharePerSec, 5, 300, 10000);
    await tokenStaking.deployed();
  
    await token.transfer(user1.address, toWei("100"));
    await token.transfer(user2.address, toWei("100"));
    await token.transfer(user3.address, toWei("100"));
    await token.transfer(user4.address, toWei("100"));
  
    await token.connect(user1).approve(tokenStaking.address, toWei("100"));
    await token.connect(user2).approve(tokenStaking.address, toWei("100"));
    await token.connect(user3).approve(tokenStaking.address, toWei("100"));
    await token.connect(user4).approve(tokenStaking.address, toWei("100"));

    await veToken.transferOwnership(tokenStaking.address);
  });

  describe("Check deployments", function() {
  it("Should assign the tokens to user", async function() {
    expect(await token.balanceOf(user1.address)).to.equal(toWei("100"));
  });
  it("Should set the right addresses", async function() {
    expect(await tokenStaking.veRelay()).to.equal(veToken.address);
    expect(await tokenStaking.relay()).to.equal(token.address);
  });
  it("Should set the right state variables", async function() {
    expect(await tokenStaking.maxCapPct()).to.equal(10000);
    expect(await tokenStaking.speedUpThreshold()).to.equal(5);
    expect(await tokenStaking.speedUpDuration()).to.equal(300);
    expect(await tokenStaking.veRelayPerSharePerSec()).to.equal(toWei("1"));
    expect(await tokenStaking.speedUpVeRelayPerSharePerSec()).to.equal(toWei("1"));
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
  // it("Should not allow user to deposit 0 amount", async function() {
  //   expect (await tokenStaking.connect(user1).deposit(0)).to.be.revertedWith("VeRelayStaking: Deposit amount should be greater than zero");
  // });
  it("Should update the variables after deposit", async function() {
    const beforeUser1Info = await tokenStaking.userInfos(
      user1.address
    );
    expect(await beforeUser1Info[0]).to.equal(0);
    expect(await beforeUser1Info[1]).to.equal(0);
    expect(await beforeUser1Info[2]).to.equal(0);
    expect(await beforeUser1Info[3]).to.equal(0);

    expect(await token.balanceOf(user1.address)).to.equal(toWei("100"));

    await tokenStaking.connect(user1).deposit(toWei("10"));
    const depositBlock = await ethers.provider.getBlock();

    expect(await token.balanceOf(user1.address)).to.equal(toWei("90"));

    const afterUser1Info = await tokenStaking.userInfos(
      user1.address
    );
    expect(await afterUser1Info[0]).to.equal(toWei("10"));
    expect(await afterUser1Info[1]).to.equal(0);
    expect(await afterUser1Info[2]).to.equal(depositBlock.timestamp);
  });
  it("should have correct updated user balance after deposit with non-zero balance", async function () {
    const beforeUser1Info = await tokenStaking.userInfos(user1.address);
    expect(await beforeUser1Info[0]).to.equal(toWei("0"));
    await tokenStaking.connect(user1).deposit(toWei("10"));
    const afterUser1Info = await tokenStaking.userInfos(user1.address);
    expect(afterUser1Info[0]).to.equal(toWei("10"));
  });
  it("Should claim the pending veRelay after second deposit", async function() {
    expect(await veToken.balanceOf(user1.address)).to.equal(0);
    await tokenStaking.connect(user1).deposit(toWei("10"));
    await increase(29);
    await tokenStaking.connect(user1).claim();
    expect(await veToken.balanceOf(user1.address)).to.equal(toWei("600"));
    const user1Bal = await tokenStaking.userInfos(user1.address);
    expect(await user1Bal[0]).to.equal(toWei("10"));
  });
  it("should receive speed up benefits after depositing speedUpThreshold with non-zero balance", async function () {
  await tokenStaking.connect(user1).deposit(toWei("10"));
  await increase(350);
  await tokenStaking.connect(user1).claim();
  const afterClaimUser1Info = await tokenStaking.userInfos(user1.address);
  // speedUpTimestamp
  expect(afterClaimUser1Info[3]).to.equal(0);

  await tokenStaking.connect(user1).deposit(toWei("5"));
  const secondDepositBlock = await ethers.provider.getBlock();
  const secondDepositUser1Info = await tokenStaking.userInfos(user1.address);
  // speedUpTimestamp
  expect(secondDepositUser1Info[3]).to.equal(secondDepositBlock.timestamp + 300);
});
  it("should not receive speed up benefits after depositing less than speedUpThreshold with non-zero balance", async function () {
  await tokenStaking.connect(user1).deposit(toWei("10"));
  await increase(300);
  await tokenStaking.connect(user1).deposit(toWei("0.1"));
  const afterUser1Info = await tokenStaking.userInfos(user1.address);
  // speedUpTimestamp
  expect(afterUser1Info[3]).to.equal(0);
});
});

describe("function Withdraw", function () {
  // it("Should not execute if the withdraw amount is zero", async function() {
  //   expect(await tokenStaking.connect(user2).withdraw(0)).to.be.revertedWith("VeRelayStaking: expected withdraw amount to be greater than zero");
  // });
  // it("Should not execute if withdraw amount is greater than user balance", async function() {
  //   expect(await tokenStaking.connect(user2).withdraw(1)).to.be.revertedWith("VeRelayStaking: cannot withdraw greater amount of RELAY than currently staked");
  // });
it("should update the balances and info after withdrawal", async function () {
    await tokenStaking.connect(user1).deposit(toWei("10"));
    const depositBlock = await ethers.provider.getBlock();

    expect(await token.balanceOf(user1.address)).to.equal(toWei("90"));

    await increase(tokenStaking.speedUpDuration / 2);

    await tokenStaking.connect(user1).claim();
    const claimBlock = await ethers.provider.getBlock();

    expect(await veToken.balanceOf(user1.address)).to.equal(toWei("40"));

    const beforeUser1Info = await tokenStaking.userInfos(user1.address);
    // balance
    expect(beforeUser1Info[0]).to.equal(toWei("10"));
    // rewardDebt
    // Divide by 2 since half of it is from the speed up
    expect(beforeUser1Info[1]).to.equal((await veToken.balanceOf(user1.address)).div(2));
    // lastClaimTimestamp
    expect(beforeUser1Info[2]).to.be.equal(claimBlock.timestamp);
    // speedUpEndTimestamp
    // expect(beforeUser1Info[3]).to.equal(depositBlock.timestamp + await tokenStaking.speedUpDuration());

    await tokenStaking.connect(user1).withdraw(toWei("5"));
    const withdrawBlock = await ethers.provider.getBlock();

    // Check user info fields are updated correctly
    const afterUser1Info = await tokenStaking.userInfos(user1.address);
    // balance
    expect(afterUser1Info[0]).to.equal(toWei("5"));
    // rewardDebt
    expect(afterUser1Info[1]).to.equal((await tokenStaking.accVeRelayPerShare()).mul(5));
    // lastClaimTimestamp
    expect(afterUser1Info[2]).to.equal(withdrawBlock.timestamp);
    // speedUpEndTimestamp
    expect(afterUser1Info[3]).to.be.equal(0);

    // Check user token balances are updated correctly
    expect(await veToken.balanceOf(user1.address)).to.equal(0);
    expect(await token.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("95"));
  });
});

describe("function Claim", function () {
  it("should not be able to claim with zero balance", async function () {
    await expect(tokenStaking.connect(user2).claim()
    ).to.be.revertedWith("VeRelayStaking: cannot claim veRELAY when no RELAY is staked");
  });
  it("should update lastRewardTimestamp on claim", async function () {
    await tokenStaking.connect(user2).deposit(toWei("10"));
    await increase(49);
    await tokenStaking.connect(user2).claim();
    const claimBlock = await ethers.provider.getBlock();

    // lastRewardTimestamp
    expect(await tokenStaking.lastRewardTimestamp()).to.equal(claimBlock.timestamp);
  });
  it("should receive veRelay tokens on claim", async function () {
    await tokenStaking.connect(user2).deposit(toWei("10"));
    await increase(49);
    expect(await veToken.balanceOf(user2.address)).to.equal(0);

    await tokenStaking.connect(user2).claim();
    expect(await veToken.balanceOf(user2.address)).to.equal(toWei("1000"));
  });
  it("should receive correct veRelay if veRelayPerSharePerSec is updated multiple times", async function () {
    await tokenStaking.connect(user1).deposit(toWei("10"));
    await increase(9);
    await tokenStaking.setVeRelayPerSharePerSec(toWei("2"));
    await increase(9);
    await tokenStaking.setVeRelayPerSharePerSec(toWei("1.5"));
    await increase(9);
    // Check veRelay balance before claim
    expect(await veToken.balanceOf(user1.address)).to.equal(0);
    await tokenStaking.connect(user1).claim();
    // Check veRelay balance after claim
    // For baseVeRelay, we're expected to have been generating at a rate of 1 for
    // the first 10 seconds, a rate of 2 for the next 10 seconds, and a rate of
    // 1.5 for the last 10 seconds, i.e.:
    // baseVeRelay = 10 * 10 * 1 + 10 * 10 * 2 + 10 * 10 * 1.5 = 450
    // speedUpVeJoe = 10 * 30 = 300
    expect(await veToken.balanceOf(user1.address)).to.equal(toWei("750"));
  });
});

describe("function updateRewardVars", function () {
  it("should have correct reward vars after time passes", async function () {
    await tokenStaking.connect(user1).deposit(toWei("1"));
    const block = await ethers.provider.getBlock();
    await increase(29);
    const accVeRelayPerShareBeforeUpdate = await tokenStaking.accVeRelayPerShare();
    await tokenStaking.updateRewardVars();
    expect(await tokenStaking.lastRewardTimestamp()).to.equal(block.timestamp + 30);
    expect(await tokenStaking.accVeRelayPerShare()).to.equal(accVeRelayPerShareBeforeUpdate.add(toWei("30")));
  });
});


const increase = (seconds) => {
  ethers.provider.send("evm_increaseTime", [seconds]);
  ethers.provider.send("evm_mine", []);
};

});
