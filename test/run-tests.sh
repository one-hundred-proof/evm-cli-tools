#!/bin/bash

#
# Really dumb tests that just "smoke test" the scripts
#

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $THIS_DIR/../bin

echo -e "\n$(tput setaf 5)[+] evm-pretty$(tput sgr0)"
./evm-pretty.js 1000000000000000000

echo -e "\n$(tput setaf 5)[+] evm-to-checksum-address$(tput sgr0)"
./evm-to-checksum-address.js 0xbe6932de5de6e7f8fae2d9f013321aec36997a30 0xd5055a782813da3862e9c9980bb047511960749f

echo -e "\n$(tput setaf 5)[+] diff-contract-code$(tput sgr0)"
./diff-contract-code.js --chain ethereum 0x152442d77e9fb9c210953d583cbb2da88027fcb9 0x282fd46e108e40a45e4ce425ba75f80245e6c2e0

echo -e "\n$(tput setaf 5)[+] get-contract-code$(tput sgr0)"
TMPFILE=$(mktemp "get-contract-code-XXXXX.out")
./get-contract-code.js --chain ethereum 0x152442d77e9fb9c210953d583cbb2da88027fcb9 2>&1 | tee "$TMPFILE"
CONTRACT_DIR=$(cat $TMPFILE | grep 'Files saved' | sed 's/Files saved in//' | xargs echo)
rm -rf "$CONTRACT_DIR" "$TMPFILE"

