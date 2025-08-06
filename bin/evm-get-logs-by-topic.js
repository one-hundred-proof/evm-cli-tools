#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY, displayChain } from '../lib/config-utils.js';

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)))
  .command('$0 <address> <topic> [from-block] [to-block] [options...]', "", (yargs => {
    yargs.positional('address', {
      describe: chalk.cyan('Contract address to get logs for'),
      type: 'string',
      demandOption: true
    })
    .positional('topic', {
      describe: chalk.cyan('Event topic hash (keccak256 of the event signature)'),
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
    .example('$0 0x1234... 0xabcd...', `${chalk.green('Get logs with topic 0xabcd... for contract 0x1234...')}`)
    .example('$0 --chain polygon 0x1234... 0xabcd... 1000000', `${chalk.green('Get logs from block 1000000 on Polygon')}`)
  }));

const argv = yargsInstance.parse();

// Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, "scan-api-key": scanApiKey, "scan-api-domain": scanApiDomain, "chain-id": chainId } = chainConfig;

// Display which chain we're using
displayChain(chainName);

if (!scanApiKey) {
  console.error(chalk.red(`Please set scan-api-key for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  process.exit(1);
}

if (!scanApiDomain) {
  console.error(chalk.red(`Please set scan-api-domain for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  process.exit(1);
}

if (!argv.address || !argv.topic) {
  console.error(chalk.red('Missing required arguments'));
  yargsInstance.showHelp();
  process.exit(1);
}

const url = `https://${scanApiDomain}/v2/api?chainid=${chainId}&module=logs&action=getLogs&address=${argv.address}&fromBlock=${argv.fromBlock}&toBlock=${argv.toBlock}&apikey=${scanApiKey}&topic0=${argv.topic}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    if (data.status === '0') {
      console.error(chalk.red(`Error: ${data.message || 'Unknown error'}`));
      process.exit(1);
    }

    if (argv.pretty) {
      console.error(chalk.green(`Found ${data.result.length} logs with topic ${chalk.cyan(argv.topic)}:`));
      console.log(JSON.stringify(data.result, null, 2));
    } else {
      console.log(JSON.stringify(data.result));
    }
  })
  .catch(error => {
    console.error(chalk.red('Error fetching logs:'), error);
    process.exit(1);
  });
