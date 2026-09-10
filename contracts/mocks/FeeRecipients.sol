// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ICollection} from "../interfaces/ICollection.sol";

/// Test double: refuses plain ETH (no `receive` / `payable fallback`). Used as a
/// fee recipient to exercise `Collection.FeeTransferFailed`.
contract RejectEther {
    uint256 public poked;

    function poke() external {
        poked++;
    }
}

/// Test double: on receiving ETH it re-enters `Collection.createCollection`. Used
/// to prove the `nonReentrant` guard on the create path.
contract ReenterOnReceive {
    ICollection private immutable _collection;
    bool private _armed;

    constructor(address collection_) {
        _collection = ICollection(collection_);
    }

    function arm() external {
        _armed = true;
    }

    receive() external payable {
        if (!_armed) return;
        _armed = false;
        _collection.createCollection{value: msg.value}(
            ICollection.CreateParams({name: "reenter", metadataURI: "", expectedComponentCount: 1})
        );
    }
}
