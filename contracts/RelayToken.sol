// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RelayToken is ERC20, Ownable {
    constructor() ERC20("Relay tokens", "RLY") {
        _mint(msg.sender, 10000*10**18);
    }
}
