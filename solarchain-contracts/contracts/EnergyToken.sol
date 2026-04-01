// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract EnergyToken is ERC20, ERC20Burnable, Ownable {
    address public meterOracle;

    event MeterOracleUpdated(address indexed previousOracle, address indexed newOracle);

    error NotMeterOracle();
    error InvalidOracleAddress();

    constructor() ERC20("SolarToken", "SKWH") Ownable(msg.sender) {}

    modifier onlyMeterOracle() {
        if (msg.sender != meterOracle) {
            revert NotMeterOracle();
        }
        _;
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function setMeterOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) {
            revert InvalidOracleAddress();
        }

        address previousOracle = meterOracle;
        meterOracle = newOracle;
        emit MeterOracleUpdated(previousOracle, newOracle);
    }

    function mint(address to, uint256 amount) external onlyMeterOracle {
        _mint(to, amount);
    }
}
