#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { getCurrentChainConfig, cleanArgs } from '../lib/config-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get chain configuration
const chainConfig = getCurrentChainConfig(process.argv);
const { chainName, api_key, prefix } = chainConfig;

if (!api_key) {
  console.log(`Please set api_key for chain '${chainName}' in ~/.block-explorer-utils/config.json`);
  process.exit(1);
}

const rpcPrefix = prefix || "https://mainnet.infura.io/v3";

// Clean arguments (remove --chain and its value)
const cleanedArgs = cleanArgs(process.argv);

if (cleanedArgs.length < 4) {
  console.log(`Usage: ${path.basename(cleanedArgs[1])} [--chain <chain-name>] <contract address> <storage slot> [<block>]`);
  process.exit(1);
}

const contract = cleanedArgs[2];
const slot = cleanedArgs[3];
const block = cleanedArgs.length > 4 ? cleanedArgs[4] : 'latest';

console.log(`Using chain: ${chainName}`);
console.log(`${slot}: `);

const url = `${rpcPrefix}/${api_key}`;
const body = {
  jsonrpc: "2.0",
  method: "eth_getStorageAt",
  params: [contract, slot, block],
  id: 1
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})
  .then(response => response.json())
  .then(data => console.log(data.result))
  .catch(error => {
    console.error('Error fetching storage:', error);
    process.exit(1);
  });
