#!/bin/bash

#
# Really dumb tests that just "smoke test" the scripts
#

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $THIS_DIR/../bin

# ANSI color codes
BRIGHT_MAGENTA="\033[1;35m"
RESET="\033[0m"

echo -e "\n${BRIGHT_MAGENTA}[+] evm-pretty${RESET}"
./evm-pretty.js 1000000000000000000

echo -e "\n${BRIGHT_MAGENTA}[+] evm-to-checksum-address${RESET}"
./evm-to-checksum-address.js 0xbe6932de5de6e7f8fae2d9f013321aec36997a30 0xd5055a782813da3862e9c9980bb047511960749f

echo -e "\n${BRIGHT_MAGENTA}[+] diff-contract-code${RESET}"
./evm-diff.js --chain ethereum 0x152442d77e9fb9c210953d583cbb2da88027fcb9 0x282fd46e108e40a45e4ce425ba75f80245e6c2e0

echo -e "\n${BRIGHT_MAGENTA}[+] get-contract-code${RESET}"
TMPFILE=$(mktemp "get-contract-code-XXXXX.out")
./evm-get-code.js --chain ethereum 0x152442d77e9fb9c210953d583cbb2da88027fcb9 2>&1 | tee "$TMPFILE"
CONTRACT_DIR=$(cat $TMPFILE | grep 'Files saved' | sed 's/Files saved in//' | xargs echo)
rm -rf "$CONTRACT_DIR" "$TMPFILE"

echo -e "\n${BRIGHT_MAGENTA}[+] evm-get-storage${RESET}"
./evm-get-storage.js --chain base 0xeb8A7B0184373550DCAa79156812F5d33e998C1E 20 -k "address(0x40461291347e1eCbb09499F3371D3f17f10d7159)"

./evm-get-storage.js --chain ethereum 0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb 2 \
    -k "0x5f8a138ba332398a9116910f4d5e5dcd9b207024c5290ce5bc87bc2dbd8e4a86" \
    -k "0x9a8bC3B04b7f3D87cfC09ba407dCED575f2d61D8" -n 3 -t d -b 23085879