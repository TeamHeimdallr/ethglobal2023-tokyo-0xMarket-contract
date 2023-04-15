// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IAccount {
    function owner() external returns (address);

    function changeOwner(address) external;
}

interface IPUSHCommInterface {
    function subscribe(address _channel) external returns (bool);

    function isUserSubscribed(
        address _channel,
        address _user
    ) external view returns (bool);

    function sendNotification(
        address _channel,
        address _recipient,
        bytes memory _identity
    ) external returns (bool);
}

contract AccountMarketplace {
    address private EPNS_COMM_ADDRESS =
        0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa; // Goerli
    address private EPNS_CHANNEL = 0x1884e327984E12b8ce525D2AC3B7aa08271c83f4;

    address tokenAddress;
    mapping(address => address) accountOwner;
    mapping(address => uint) accountPrice;
    mapping(address => address) payoutReceiver;
    address[] accounts;

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    event ListAccount(address account, address receiver, uint price);
    event BuyAccount(address account);

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

    // The listner who wants to get alarmed needs to subscribe the channel
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
        payoutReceiver[account] = receiver == address(0)
            ? msg.sender
            : receiver;
        accounts.push(account);

        emit ListAccount(
            account,
            receiver == address(0) ? msg.sender : receiver,
            price
        );
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

        // Need an approval in advance
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            accountOwner[account],
            accountPrice[account]
        );

        IAccount(account).changeOwner(msg.sender);
        emit BuyAccount(account);

        if (
            IPUSHCommInterface(EPNS_COMM_ADDRESS).isUserSubscribed(
                EPNS_CHANNEL,
                accountOwner[account]
            )
        ) {
            // This contract needs to be delegated from the channel admin
            IPUSHCommInterface(EPNS_COMM_ADDRESS).sendNotification(
                EPNS_CHANNEL,
                accountOwner[account],
                bytes(
                    string(
                        abi.encodePacked(
                            "0",
                            "+",
                            "3",
                            "+",
                            "Your Account has been Sold!",
                            "+",
                            Strings.toHexString(msg.sender),
                            " is sold with the price ",
                            Strings.toString(accountPrice[account])
                        )
                    )
                )
            );
        }

        // Reset mappings
        accountOwner[account] = msg.sender;
        accountPrice[account] = 0;
        payoutReceiver[account] = address(0);
    }

    function accountRegister(
        address account
    ) external view returns (address owner) {
        owner = accountOwner[account];
    }

    function getAccounts() external view returns (address[] memory) {
        return accounts;
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
