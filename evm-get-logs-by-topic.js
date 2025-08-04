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
const { chainName, scan_api_key, scan_api_domain } = chainConfig;

if (!scan_api_key) {
  console.log(`Please set scan_api_key for chain '${chainName}' in ~/.block-explorer-utils/config.json`);
  process.exit(1);
}

if (!scan_api_domain) {
  console.log(`Please set scan_api_domain for chain '${chainName}' in ~/.block-explorer-utils/config.json`);
  process.exit(1);
}

// Clean arguments (remove --chain and its value)
const cleanedArgs = cleanArgs(process.argv);

if (cleanedArgs.length < 4) {
  console.log(`Usage: ${path.basename(cleanedArgs[1])} [--chain <chain-name>] <address> <topic> [<fromBlock>] [<toBlock>]`);
  process.exit(1);
}

const address = cleanedArgs[2];
const topic = cleanedArgs[3];
const fromBlock = cleanedArgs.length > 4 ? cleanedArgs[4] : '1';
const toBlock = cleanedArgs.length > 5 ? cleanedArgs[5] : 'latest';

console.log(`Using chain: ${chainName}`);

const url = `https://${scan_api_domain}/api?module=logs&action=getLogs&address=${address}&fromBlock=${fromBlock}&toBlock=${toBlock}&apikey=${scan_api_key}&topic0=${topic}`;

fetch(url)
  .then(response => response.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(error => {
    console.error('Error fetching logs:', error);
    process.exit(1);
  });
