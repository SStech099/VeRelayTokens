// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./VeRelayToken.sol";

contract VeRelayStaking is OwnableUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct UserInfo {
        uint256 balance;
        uint256 rewardDebt;
        uint256 lastClaimTimestamp;
    }

    IERC20Upgradeable public relay;
    VeRelayToken public veRelay;
    uint256 public maxCapPct;
    uint256 public upperLimitMaxCapPct;
    uint256 public accVeRelayPerShare;
    uint256 public ACC_VERELAY_PER_SHARE_PRECISION;
    uint256 public lastRewardTimestamp;
    uint256 public veRelayPerSharePerSec;
    uint256 public upperLimitVeRelayPerSharePerSec;
    uint256 public VERELAY_PER_SHARE_PER_SEC_PRECISION;

    mapping(address => UserInfo) public userInfos;

    event Claim(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    event UpdateMaxCapPct(address indexed user, uint256 maxCapPct);
    event UpdateRewardVars(uint256 lastRewardTimestamp, uint256 accVeRelayPerShare);
    event UpdateVeRelayPerSharePerSec(address indexed user, uint256 veRelayPerSharePerSec);
    event Withdraw(address indexed user, uint256 withdrawAmount, uint256 burnAmount);

    constructor(
        IERC20Upgradeable _relay,
        VeRelayToken _veRelay,
        uint256 _veRelayPerSharePerSec,
        uint256 _maxCapPct
    ){

        require(address(_relay) != address(0), "VeRelayStaking: unexpected zero address for _relay");
        require(address(_veRelay) != address(0), "VeRelayStaking: unexpected zero address for _veRelay");

        upperLimitVeRelayPerSharePerSec = 1e36;
        require(
            _veRelayPerSharePerSec <= upperLimitVeRelayPerSharePerSec,
            "VeRelayStaking: expected _veRelayPerSharePerSec to be <= 1e36"
        );

        upperLimitMaxCapPct = 10000000;
        require(
            _maxCapPct != 0 && _maxCapPct <= upperLimitMaxCapPct,
            "VeRelayStaking: expected _maxCapPct to be non-zero and <= 10000000"
        );

        maxCapPct = _maxCapPct;
        relay = _relay;
        veRelay = _veRelay;
        veRelayPerSharePerSec = _veRelayPerSharePerSec;
        lastRewardTimestamp = block.timestamp;
        ACC_VERELAY_PER_SHARE_PRECISION = 1e18;
        VERELAY_PER_SHARE_PER_SEC_PRECISION = 1e18;
    }

    function setMaxCapPct(uint256 _maxCapPct) external onlyOwner {
        require(_maxCapPct > maxCapPct, "VeRelayStaking: expected new _maxCapPct to be greater than existing maxCapPct");
        require(
            _maxCapPct != 0 && _maxCapPct <= upperLimitMaxCapPct,
            "VeRelayStaking: expected new _maxCapPct to be non-zero and <= 10000000"
        );
        maxCapPct = _maxCapPct;
        emit UpdateMaxCapPct(_msgSender(), _maxCapPct);
    }

    function setVeRelayPerSharePerSec(uint256 _veRelayPerSharePerSec) external onlyOwner {
        require(
            _veRelayPerSharePerSec <= upperLimitVeRelayPerSharePerSec,
            "VeRelayStaking: expected _veRelayPerSharePerSec to be <= 1e36"
        );
        updateRewardVars();
        veRelayPerSharePerSec = _veRelayPerSharePerSec;
        emit UpdateVeRelayPerSharePerSec(_msgSender(), _veRelayPerSharePerSec);
    }

    function deposit(uint256 _amount) external {
        require(_amount > 0, "VeRelayStaking: expected deposit amount to be greater than zero");

        updateRewardVars();

        UserInfo storage userInfo = userInfos[_msgSender()];

        if (_getUserHasNonZeroBalance(_msgSender())) {

            _claim();

            userInfo.lastClaimTimestamp = block.timestamp;

            uint256 userStakedRelay = userInfo.balance;

        } else {
            userInfo.lastClaimTimestamp = block.timestamp;
        }

        userInfo.balance = userInfo.balance.add(_amount);
        userInfo.rewardDebt = accVeRelayPerShare.mul(userInfo.balance).div(ACC_VERELAY_PER_SHARE_PRECISION);

        relay.safeTransferFrom(_msgSender(), address(this), _amount);

        emit Deposit(_msgSender(), _amount);
    }

    function withdraw(uint256 _amount) external {
        require(_amount > 0, "VeRelayStaking: expected withdraw amount to be greater than zero");

        UserInfo storage userInfo = userInfos[_msgSender()];

        require(
            userInfo.balance >= _amount,
            "VeRelayStaking: cannot withdraw greater amount of RELAY than currently staked"
        );
        updateRewardVars();

        // Note that we don't need to claim as the user's veRELAY balance will be reset to 0
        userInfo.balance = userInfo.balance.sub(_amount);
        userInfo.rewardDebt = accVeRelayPerShare.mul(userInfo.balance).div(ACC_VERELAY_PER_SHARE_PRECISION);
        userInfo.lastClaimTimestamp = block.timestamp;

        uint256 userVeRelayBalance = veRelay.balanceOf(_msgSender());
        veRelay.burnFrom(_msgSender(), userVeRelayBalance);

        relay.safeTransfer(_msgSender(), _amount);

        emit Withdraw(_msgSender(), _amount, userVeRelayBalance);
    }

    function claim() external {
        require(_getUserHasNonZeroBalance(_msgSender()), "VeRelayStaking: cannot claim veRELAY when no RELAY is staked");
        updateRewardVars();
        _claim();
    }

    function getPendingVeRelay(address _user) public view returns (uint256) {
        if (!_getUserHasNonZeroBalance(_user)) {
            return 0;
        }

        UserInfo memory user = userInfos[_user];

        uint256 _accVeRelayPerShare = accVeRelayPerShare;
        uint256 secondsElapsed = block.timestamp.sub(lastRewardTimestamp);
        if (secondsElapsed > 0) {
            _accVeRelayPerShare = _accVeRelayPerShare.add(
                secondsElapsed.mul(veRelayPerSharePerSec).mul(ACC_VERELAY_PER_SHARE_PRECISION).div(
                    VERELAY_PER_SHARE_PER_SEC_PRECISION
                )
            );
        }
        uint256 pendingBaseVeRelay = _accVeRelayPerShare.mul(user.balance).div(ACC_VERELAY_PER_SHARE_PRECISION).sub(
            user.rewardDebt
        );
      

        uint256 userVeRelayBalance = veRelay.balanceOf(_user);

        uint256 scaledUserMaxVeRelayCap = user.balance.mul(maxCapPct);

        uint256 pendingVeRelay = pendingBaseVeRelay;

        if (userVeRelayBalance.mul(100) >= scaledUserMaxVeRelayCap) {

            return 0;
        } else if (userVeRelayBalance.add(pendingVeRelay).mul(100) > scaledUserMaxVeRelayCap) {
            return scaledUserMaxVeRelayCap.sub(userVeRelayBalance.mul(100)).div(100);
        } else {
            return pendingVeRelay;
        }
    }

    function updateRewardVars() public {
        if (block.timestamp <= lastRewardTimestamp) {
            return;
        }

        if (relay.balanceOf(address(this)) == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 secondsElapsed = block.timestamp.sub(lastRewardTimestamp);
        accVeRelayPerShare = accVeRelayPerShare.add(
            secondsElapsed.mul(veRelayPerSharePerSec).mul(ACC_VERELAY_PER_SHARE_PRECISION).div(
                VERELAY_PER_SHARE_PER_SEC_PRECISION
            )
        );
        lastRewardTimestamp = block.timestamp;

        emit UpdateRewardVars(lastRewardTimestamp, accVeRelayPerShare);
    }

    function _getUserHasNonZeroBalance(address _user) private view returns (bool) {
        return userInfos[_user].balance > 0;
    }

    function _claim() private {
        uint256 veRelayToClaim = getPendingVeRelay(_msgSender());

        UserInfo storage userInfo = userInfos[_msgSender()];

        userInfo.rewardDebt = accVeRelayPerShare.mul(userInfo.balance).div(ACC_VERELAY_PER_SHARE_PRECISION);

        if (veRelayToClaim > 0) {
            userInfo.lastClaimTimestamp = block.timestamp;

            veRelay.mint(_msgSender(), veRelayToClaim);
            emit Claim(_msgSender(), veRelayToClaim);
        }
    }
}
