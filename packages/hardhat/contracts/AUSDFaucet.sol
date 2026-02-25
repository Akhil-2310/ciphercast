// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IShieldedStablecoin {
    function confidentialMint(address to, uint64 amount) external;
}

contract AUSDFaucet {
    uint64 public constant FAUCET_AMOUNT = 100e6; // 100 AUSD (6 decimals)
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => uint256) public lastClaim;

    IShieldedStablecoin public ausd;
    address public owner;
    bool public faucetEnabled = true;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _ausd) {
        ausd = IShieldedStablecoin(_ausd);
        owner = msg.sender;
    }

    function claim() external {
        require(faucetEnabled, "Faucet disabled");
        require(
            block.timestamp >= lastClaim[msg.sender] + COOLDOWN,
            "Cooldown active"
        );

        lastClaim[msg.sender] = block.timestamp;
        ausd.confidentialMint(msg.sender, FAUCET_AMOUNT);
    }

    function disableFaucet() external onlyOwner {
        faucetEnabled = false;
    }
}
