#!/usr/bin/env node

// Use Foundry's "cast to-check-sum-address" instead

import web3 from "web3";
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { setupYargs } from '../lib/config-utils.js';

const yargsInstance = setupYargs(yargs(hideBin(process.argv)))
  .command('$0 <addresses...> [options...]', "", (yargs) => {
    yargs.positional('addresses', {
      describe: chalk.cyan('Ethereum address(es) to convert to checksum format'),
      type: 'string',
      demandOption: true
    })
    .example('$0 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', `${chalk.green('Convert address to checksum format')}`)
    .example('$0 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 0x70997970c51812dc3a010c7d01b50e0d17dc79c8', `${chalk.green('Convert multiple addresses')}`)
  });

const argv = yargsInstance.parse();

if (argv.length === 0) {
  console.error(chalk.red('Missing required address argument'));
  yargs.showHelp();
  process.exit(1);
}

for (const address of argv.addresses) {
  try {
    console.log(web3.utils.toChecksumAddress(address));
  } catch (error) {
    console.error(chalk.red(`Error converting address ${address}: ${error.message}`));
  }
}

