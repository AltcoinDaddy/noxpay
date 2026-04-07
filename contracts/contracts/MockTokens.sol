// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint 1 million USDC to deployer
        _mint(msg.sender, 1000000 * 10**6);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}

contract MockConfidentialToken is Ownable {
    address public underlying;
    mapping(address => bytes32) private _balances;
    uint256 private mockHandleCounter = 1;

    constructor(address _underlying) Ownable(msg.sender) {
        underlying = _underlying;
    }

    function wrap(address to, uint256 amount) external returns (bytes32 handle) {
        ERC20(underlying).transferFrom(msg.sender, address(this), amount);
        handle = bytes32(mockHandleCounter++);
        _balances[to] = handle;
    }

    function unwrap(
        address /* from */,
        address to,
        bytes32,
        bytes calldata
    ) external returns (bytes32 requestId) {
        ERC20(underlying).transfer(to, 1 * 10**6); // Dummy unwrap amount
        return bytes32(0);
    }

    function confidentialTransfer(
        address,
        address to,
        bytes32 encryptedAmount,
        bytes calldata
    ) external returns (bytes32 success) {
        _balances[to] = encryptedAmount; // Dummy implementation
        return bytes32(uint256(1));
    }

    function confidentialBalanceOf(address account) external view returns (bytes32 handle) {
        return _balances[account];
    }

    function addViewer(bytes32, address) external {}
    function removeViewer(bytes32, address) external {}
}
