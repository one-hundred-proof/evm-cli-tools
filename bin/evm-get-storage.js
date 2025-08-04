#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCurrentChainConfig, setupYargs } from '../lib/config-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)), 
  `${chalk.bold('Usage:')} $0 [options] <contract-address> <storage-slot> [block]`)
  .positional('contract-address', {
    describe: chalk.cyan('Contract address to query storage from'),
    type: 'string',
    demandOption: true
  })
  .positional('storage-slot', {
    describe: chalk.cyan('Storage slot to query (hex or decimal)'),
    type: 'string',
    demandOption: true
  })
  .positional('block', {
    describe: chalk.cyan('Block number or "latest"'),
    type: 'string',
    default: 'latest'
  })
  .example('$0 0x1234... 0', `${chalk.green('Get storage at slot 0')}`)
  .example('$0 --chain polygon 0x1234... 0x1 1000000', `${chalk.green('Get storage at slot 0x1 at block 1000000 on Polygon')}`);

const argv = yargsInstance.argv;

// Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, api_key, prefix } = chainConfig;

if (!api_key) {
  console.error(chalk.red(`Please set api_key for chain '${chainName}' in ~/.block-explorer-utils/config.json`));
  process.exit(1);
}

const rpcPrefix = prefix || "https://mainnet.infura.io/v3";

// Get positional arguments
const contract = argv._[0];
const slot = argv._[1];
const block = argv._[2] || 'latest';

if (!contract || slot === undefined) {
  console.error(chalk.red('Missing required arguments'));
  yargsInstance.showHelp();
  process.exit(1);
}

console.log(chalk.blue(`Storage at slot ${chalk.bold(slot)}:`));

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
