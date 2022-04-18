// @ts-nocheck
const { ethers, network, upgrades } = require("hardhat");
const { expect } = require("chai");
const { describe } = require("mocha");

describe("VeRelay Staking", function () {
  before(async function () {
    this.VeRelayStakingCF = await ethers.getContractFactory("VeRelayStaking");
    this.VeRelayTokenCF = await ethers.getContractFactory("VeRelayToken");
    this.RelayTokenCF = await ethers.getContractFactory("RelayToken");

    this.signers = await ethers.getSigners();
    this.dev = this.signers[0];
    this.alice = this.signers[1];
    this.bob = this.signers[2];
    this.carol = this.signers[3];
  });

  beforeEach(async function () {
    this.veRelay = await this.VeRelayTokenCF.deploy();
    this.relay = await this.RelayTokenCF.deploy();

    await this.relay.mint(this.alice.address, ethers.utils.parseEther("1000"));
    await this.relay.mint(this.bob.address, ethers.utils.parseEther("1000"));
    await this.relay.mint(this.carol.address, ethers.utils.parseEther("1000"));

    this.veRelayPerSharePerSec = ethers.utils.parseEther("1");
    this.speedUpVeRelayPerSharePerSec = ethers.utils.parseEther("1");
    this.speedUpThreshold = 5;
    this.speedUpDuration = 50;
    this.maxCapPct = 20000;

    this.veRelayStaking = await upgrades.deployProxy(this.VeRelayStakingCF, [
      this.relay.address,
      this.veRelay.address,
      this.veRelayPerSharePerSec,
      this.speedUpVeRelayPerSharePerSec,
      this.speedUpThreshold,
      this.speedUpDuration,
      this.maxCapPct,
    ]);
    await this.veRelay.transferOwnership(this.veRelayStaking.address);

    await this.relay
      .connect(this.alice)
      .approve(this.veRelayStaking.address, ethers.utils.parseEther("100000"));
    await this.relay
      .connect(this.bob)
      .approve(this.veRelayStaking.address, ethers.utils.parseEther("100000"));
    await this.relay
      .connect(this.carol)
      .approve(this.veRelayStaking.address, ethers.utils.parseEther("100000"));
  });
  describe("setMaxCapPct", function () {
    it("should not allow non-owner to setMaxCapPct", async function () {
      await expect(
        this.veRelayStaking.connect(this.alice).setMaxCapPct(this.maxCapPct + 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow owner to set lower maxCapPct", async function () {
      expect(await this.veRelayStaking.maxCapPct()).to.be.equal(this.maxCapPct);

      await expect(
        this.veRelayStaking.connect(this.dev).setMaxCapPct(this.maxCapPct - 1)
      ).to.be.revertedWith(
        "VeRelayStaking: expected new _maxCapPct to be greater than existing maxCapPct"
      );
    });

    it("should not allow owner to set maxCapPct greater than upper limit", async function () {
      await expect(
        this.veRelayStaking.connect(this.dev).setMaxCapPct(10000001)
      ).to.be.revertedWith(
        "VeRelayStaking: expected new _maxCapPct to be non-zero and <= 10000000"
      );
    });

    it("should allow owner to setMaxCapPct", async function () {
      expect(await this.veRelayStaking.maxCapPct()).to.be.equal(this.maxCapPct);

      await this.veRelayStaking
        .connect(this.dev)
        .setMaxCapPct(this.maxCapPct + 100);

      expect(await this.veRelayStaking.maxCapPct()).to.be.equal(
        this.maxCapPct + 100
      );
    });
  });

  describe("setVeRelayPerSharePerSec", function () {
    it("should not allow non-owner to setVeRelayPerSharePerSec", async function () {
      await expect(
        this.veRelayStaking
          .connect(this.alice)
          .setVeRelayPerSharePerSec(ethers.utils.parseEther("1.5"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow owner to set veRelayPerSharePerSec greater than upper limit", async function () {
      await expect(
        this.veRelayStaking
          .connect(this.dev)
          .setVeRelayPerSharePerSec(ethers.utils.parseUnits("1", 37))
      ).to.be.revertedWith(
        "VeRelayStaking: expected _veRelayPerSharePerSec to be <= 1e36"
      );
    });

    it("should allow owner to setVeRelayPerSharePerSec", async function () {
      expect(await this.veRelayStaking.veRelayPerSharePerSec()).to.be.equal(
        this.veRelayPerSharePerSec
      );

      await this.veRelayStaking
        .connect(this.dev)
        .setVeRelayPerSharePerSec(ethers.utils.parseEther("1.5"));

      expect(await this.veRelayStaking.veRelayPerSharePerSec()).to.be.equal(
        ethers.utils.parseEther("1.5")
      );
    });
  });
  
});