// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAccount {
    function owner() external returns (address);

    function trnasferOwnership(address) external;
}

contract AccountMarketplace {
    address tokenAddress;
    mapping(address => address) accountOwner;
    mapping(address => uint) accountPrice;
    mapping(address => address) payoutReceiver;

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    /*
     * For listing an account
     *   1. Register ownership of the account before ownership transfer. Don't forget this before ownership transfer!
     *   2. (Interaction with your own contract account) Change owner to this marketplace contract
     *   3. List your account to this marketplace with price you want
     *   (4. You can revoke your previous listing)
     */

    function register(address account) external {
        require(
            IAccount(account).owner() == msg.sender,
            "You are not the owner of the account"
        );
        accountOwner[account] = msg.sender;
    }

    function list(address account, address receiver, uint price) external {
        require(
            accountOwner[account] == msg.sender,
            "You need to register the account at first"
        );
        require(
            IAccount(account).owner() == address(this),
            "You need to transfer the ownership at first"
        );
        require(price != 0, "You can't list the account with price 0");
        accountPrice[account] = price;
        payoutReceiver[account] = receiver;
    }

    function revoke(address account) external {
        require(
            accountOwner[account] == msg.sender,
            "Not owner of the account"
        );
        require(accountPrice[account] != 0, "The account is not listed yet");
        accountPrice[account] = 0;
    }

    function buy(address account) external {
        require(accountPrice[account] != 0, "The account is not listed");
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            accountOwner[account],
            accountPrice[account]
        );
    }

    function accountRegister(
        address account
    ) external view returns (address owner) {
        owner = accountOwner[account];
    }

    function listedPrice(address account) external view returns (uint price) {
        price = accountPrice[account];
    }

    function accountPayoutReceiver(
        address account
    ) external view returns (address receiver) {
        receiver = payoutReceiver[account];
    }
}
