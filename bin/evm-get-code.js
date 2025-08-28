#!/usr/bin/env node

import path from 'path';
import { exit } from 'process';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY, displayChain } from '../lib/config-utils.js';
import { getFilesRecursively, getSourceFilesFromAddress } from '../lib/file-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)))
  .command('$0 <address> [options...]', "Get contract code for an address", (yargs) => {
    yargs.positional('address', {
      describe: chalk.cyan('Contract address to get source code for'),
      type: 'string',
      demandOption: true
    })
    .example(`${chalk.whiteBright('$0 0x1234...')}`, `${chalk.green('Get source code for contract 0x1234...')}`)
    .example('$0 --chain polygon 0x1234...', `${chalk.green('Get source code for contract on Polygon')}`);
  })

const argv = yargsInstance.parse();

// Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, "scan-api-key": scanApiKey, "scan-api-domain": scanApiDomain, "chain-id": chainId } = chainConfig;

// Display which chain we're using
displayChain(chainName);

if (!scanApiKey) {
  console.error(chalk.red(`Please set scan-api-key for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  exit(1);
}

if (!scanApiDomain) {
  console.error(chalk.red(`Please set scan-api-domain for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  exit(1);
}

// Get positional arguments

if (!argv.address) {
  console.error(chalk.red('Missing required address argument'));
  yargsInstance.showHelp();
  exit(1);
}

// Get the contract source code
const result = await getSourceFilesFromAddress(argv.address, scanApiDomain, scanApiKey, chainId);
getFilesRecursively(result.dir);
console.error(chalk.yellow(`Files saved in ${chalk.bold(result.dir)}`));

// If this is a proxy contract, also get the implementation contract
if (result.implementationAddress) {
  console.error(chalk.blue(`Detected proxy contract. Getting implementation at ${chalk.bold(result.implementationAddress)}`));

  const implResult = await getSourceFilesFromAddress(
    result.implementationAddress,
    scanApiDomain,
    scanApiKey,
    chainId,
    argv.address
  );

  getFilesRecursively(implResult.dir);
  console.error(chalk.yellow(`Implementation files saved in ${chalk.bold(implResult.dir)}`));
}

