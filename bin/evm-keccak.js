#!/usr/bin/env node

import web3 from "web3";
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { setupYargs, CONFIG_PATH_DISPLAY }  from '../lib/config-utils.js';

const yargsInstance = setupYargs(yargs(hideBin(process.argv)))
  .command("$0 <input> [options...]",
           "IMPORTANT: By adding a '0x' prefix it will hash the input as bytes, not a string", (yargs) => {
    yargs.positional('input', {
      describe: chalk.cyan('String or bytes to hash with keccak256. Add "0x" prefix for bytes'),
      type: 'string',
      demandOption: true
    })
    .example(`$0 "Hello World"`, `${chalk.green('Calculate keccak256 hash of "Hello World"')}`)
    .example('$0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', `${chalk.green('Calculate keccak256 hash of an address treating input as bytes')}`)
    .example('$0 "transfer(address,uint256)"', `${chalk.green('Calculate function signature')}`);
  })

const argv = yargsInstance.parse()

console.log(web3.utils.keccak256(argv.input));

