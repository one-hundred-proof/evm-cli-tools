#!/usr/bin/env node

import web3 from "web3";

if (process.argv.length < 3) {
  console.log(`Usage: ${process.argv[1]} <address>...` );
  process.exit(1);
}


for (let i=0; i < process.argv.length - 2; i++) {
  let address  = process.argv[i+2];
  console.log(web3.utils.keccak256(address));
}

