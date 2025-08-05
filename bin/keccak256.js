#!/usr/bin/env node

import web3 from "web3";
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { setupYargs, CONFIG_PATH_DISPLAY }  from '../lib/config-utils.js';

const yargsInstance = setupYargs(yargs(hideBin(process.argv)),
  `${chalk.bold('Usage:')} $0 [options] <string>...`)
  .positional('string', {
    describe: chalk.cyan('String(s) to hash with keccak256'),
    type: 'string',
    demandOption: true
  })
  .example(`$0 "Hello World"`, `${chalk.green('Calculate keccak256 hash of "Hello World"')}`)
  .example('$0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', `${chalk.green('Calculate keccak256 hash of an address')}`)
  .example('$0 "transfer(address,uint256)"', `${chalk.green('Calculate function signature')}`);

const argv = yargsInstance.argv;

if (argv._.length === 0) {
  console.error(chalk.red('Missing required string argument'));
  yargsInstance.showHelp();
  process.exit(1);
}

for (const str of argv._) {
  console.log(web3.utils.keccak256(str));
}

