#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY } from '../lib/config-utils.js';

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)),
  `${chalk.bold('Usage:')} $0 [options] <address> [from-block] [to-block]`)
  .positional('address', {
    describe: chalk.cyan('Contract address to get logs for'),
    type: 'string',
    demandOption: true
  })
  .positional('from-block', {
    describe: chalk.cyan('Starting block number'),
    type: 'string',
    default: '1'
  })
  .positional('to-block', {
    describe: chalk.cyan('Ending block number or "latest"'),
    type: 'string',
    default: 'latest'
  })
  .option('pretty', {
    describe: chalk.cyan('Pretty print the output'),
    type: 'boolean',
    default: true
  })
  .example('$0 0x1234...', `${chalk.green('Get all logs for contract 0x1234...')}`)
  .example('$0 --chain polygon 0x1234... 1000000', `${chalk.green('Get logs from block 1000000 on Polygon')}`)


const argv = yargsInstance.argv;



  // Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, scan_api_key, scan_api_domain } = chainConfig;

if (!scan_api_key) {
  console.error(chalk.red(`Please set scan_api_key for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  process.exit(1);
}

if (!scan_api_domain) {
  console.error(chalk.red(`Please set scan_api_domain for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  process.exit(1);
}

// Get positional arguments
const address = argv._[0];
const fromBlock = argv._[1] || '1';
const toBlock = argv._[2] || 'latest';

if (!address) {
  console.error(chalk.red('Missing required address argument'));
  yargsInstance.showHelp();
  process.exit(1);
}

const url = `https://${scan_api_domain}/api?module=logs&action=getLogs&address=${address}&fromBlock=${fromBlock}&toBlock=${toBlock}&apikey=${scan_api_key}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    if (data.status === '0') {
      console.error(chalk.red(`Error: ${data.message || 'Unknown error'}`));
      process.exit(1);
    }

    if (argv.pretty) {
      console.log(chalk.green(`Found ${data.result.length} logs:`));
      console.log(JSON.stringify(data.result, null, 2));
    } else {
      console.log(JSON.stringify(data.result));
    }
  })
  .catch(error => {
    console.error(chalk.red('Error fetching logs:'), error);
    process.exit(1);
  });
