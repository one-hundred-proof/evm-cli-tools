#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import chalk from 'chalk';
import yargs from 'yargs';
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY, displayChain } from '../lib/config-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(process.argv.slice(2)))
  .command('$0 <contract> <slot> [block]', "2", (yargs) => {
    yargs.positional('contract', {
      describe: chalk.cyan('Contract address to query storage from'),
      type: 'string',
      demandOption: true
    })
    .positional('slot', {
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
    .example('$0 --chain polygon 0x1234... 0x1 1000000', `${chalk.green('Get storage at slot 0x1 at block 1000000 on Polygon')}`)
})


// Get positional arguments
const argv = yargsInstance.parse();

// Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, api_key, prefix } = chainConfig;

// Display which chain we're using
displayChain(chainName);

if (!api_key) {
  console.error(chalk.red(`Please set api_key for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  process.exit(1);
}

const rpcPrefix = prefix || "https://mainnet.infura.io/v3";


if (!argv.contract || argv.slot === undefined) {
  console.error(chalk.red('Missing required arguments'));
  yargsInstance.showHelp();
  process.exit(1);
}

console.log(chalk.blue(`Storage at slot ${chalk.bold(argv.slot)}:`));

const url = `${rpcPrefix}/${api_key}`;
const body = {
  jsonrpc: "2.0",
  method: "eth_getStorageAt",
  params: [ argv.contract, argv.slot, argv.block],
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
