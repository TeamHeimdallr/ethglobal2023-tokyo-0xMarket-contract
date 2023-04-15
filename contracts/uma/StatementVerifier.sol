// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.2;

import "./OptimisticOracleV3Interface.sol";
import "./ClaimData.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// This contract allows assertions on any form of data to be made using the UMA Optimistic Oracle V3 and stores the
// proposed value so that it may be retrieved on chain. The dataId is intended to be an arbitrary value that uniquely
// identifies a specific piece of information in the consuming contract and is replaceable. Similarly, any data
// structure can be used to replace the asserted data.
contract StatementVerifier {
    using SafeERC20 for IERC20;
    IERC20 public immutable defaultCurrency;
    OptimisticOracleV3Interface public immutable oo;
    uint64 public constant assertionLiveness = 86400; // 1 day
    bytes32 public immutable defaultIdentifier;

    struct StatementAssertion {
        bytes statement; // The statement
        address asserter; // The address that made the assertion.
        bool resolved; // Whether the assertion has been resolved.
    }

    mapping(bytes32 => StatementAssertion) public assertionsData;

    event StatementAsserted(
        bytes statement,
        address indexed asserter,
        bytes32 assertionId
    );

    event StatementAssertionResolved(
        bytes statement,
        address indexed asserter,
        bytes32 assertionId
    );

    constructor(address _defaultCurrency, address _optimisticOracleV3) {
        defaultCurrency = IERC20(_defaultCurrency);
        oo = OptimisticOracleV3Interface(_optimisticOracleV3);
        defaultIdentifier = oo.defaultIdentifier();
    }

    // For a given assertionId, returns a boolean indicating whether the statement is accessible and the statement itself.
    function getData(
        bytes32 assertionId
    ) public view returns (bool, bytes memory) {
        if (!assertionsData[assertionId].resolved) {
            bytes memory emptyBytes = new bytes(0);
            return (false, emptyBytes);
        }
        return (true, assertionsData[assertionId].statement);
    }

    // Asserts statement on behalf of an asserter address.
    // statement can be asserted many times with the same combination of arguments, resulting in unique assertionIds. This is
    // because the block.timestamp is included in the claim. The consumer contract must store the returned assertionId
    // identifiers to able to get the information using getData.
    function assertDataFor(
        bytes memory statement,
        address asserter
    ) public returns (bytes32 assertionId) {
        asserter = asserter == address(0) ? msg.sender : asserter;
        uint256 bond = oo.getMinimumBond(address(defaultCurrency));
        defaultCurrency.safeTransferFrom(msg.sender, address(this), bond);
        defaultCurrency.safeApprove(address(oo), bond);
        require(statement.length <= 128, "statement cannot exceed 128 bytes");

        // The claim we want to assert is the first argument of assertTruth. It must contain all of the relevant
        // details so that anyone may verify the claim without having to read any further information on chain. As a
        // result, the claim must include statement, as well as a set of instructions that allow anyone
        // to verify the information in publicly available sources.
        // See the UMIP corresponding to the defaultIdentifier used in the OptimisticOracleV3 "ASSERT_TRUTH" for more
        // information on how to construct the claim.
        assertionId = oo.assertTruth(
            abi.encodePacked(
                "statement: ",
                statement,
                " and asserter: 0x",
                ClaimData.toUtf8BytesAddress(asserter),
                " at timestamp: ",
                ClaimData.toUtf8BytesUint(block.timestamp),
                " in the DataAsserter contract at 0x",
                ClaimData.toUtf8BytesAddress(address(this)),
                " is valid."
            ),
            asserter,
            address(this),
            address(0), // No sovereign security.
            assertionLiveness,
            defaultCurrency,
            bond,
            defaultIdentifier,
            bytes32(0) // No domain.
        );
        assertionsData[assertionId] = StatementAssertion(
            statement,
            asserter,
            false
        );
        emit StatementAsserted(statement, asserter, assertionId);
    }

    // OptimisticOracleV3 resolve callback.
    function assertionResolvedCallback(
        bytes32 assertionId,
        bool assertedTruthfully
    ) public {
        require(msg.sender == address(oo));
        // If the assertion was true, then the data assertion is resolved.
        if (assertedTruthfully) {
            assertionsData[assertionId].resolved = true;
            StatementAssertion memory statementAssertion = assertionsData[
                assertionId
            ];
            emit StatementAssertionResolved(
                statementAssertion.statement,
                statementAssertion.asserter,
                assertionId
            );
            // Else delete the data assertion if it was false to save gas.
        } else delete assertionsData[assertionId];
    }

    // If assertion is disputed, do nothing and wait for resolution.
    // This OptimisticOracleV3 callback function needs to be defined so the OOv3 doesn't revert when it tries to call it.
    function assertionDisputedCallback(bytes32 assertionId) public {}
}
