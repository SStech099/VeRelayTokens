// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract VeRelayToken is ERC20("VeRelayToken", "veRELAY"), Ownable {

    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function burnFrom(address _from, uint256 _amount) external onlyOwner {
        _burn(_from, _amount);
    }

    function renounceOwnership() public override onlyOwner {
        revert("VeRelayToken: Cannot renounce, can only transfer ownership");
    }
}
