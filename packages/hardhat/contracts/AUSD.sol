// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Confidential} from "fhenix-confidential-contracts/contracts/extensions/ERC20Confidential.sol";
import {euint64, InEuint64, FHE} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ShieldedStablecoin is ERC20, ERC20Confidential {

    constructor() ERC20Confidential("Akhil USD", "AUSD", 6) {}

    // Mint new public tokens
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Mint new shielded tokens
    function confidentialMint(address to, uint64 amount) public {
        _confidentialMint(to, amount);
    }
}