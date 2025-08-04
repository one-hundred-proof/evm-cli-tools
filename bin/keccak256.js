#!/usr/bin/env node

import web3 from "web3";
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage(`${chalk.bold('Usage:')} $0 [options] <string>...`)
  .positional('string', {
    describe: chalk.cyan('String(s) to hash with keccak256'),
    type: 'string',
    demandOption: true
  })
  .example(chalk.bold('$0 "Hello World"'), `${chalk.green('Calculate keccak256 hash of "Hello World"')}`)
  .example(chalk.bold('$0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'), `${chalk.green('Calculate keccak256 hash of an address')}`)
  .example(chalk.bold('$0 "transfer(address,uint256)"'), `${chalk.green('Calculate function signature')}`)
  .help()
  .alias('help', 'h')
  .parserConfiguration({
    'description-colors': true
  })
  .updateStrings({
    'Options:': chalk.yellow.bold('Options:'),
    'Examples:': chalk.green.bold('Examples:'),
    'Positionals:': chalk.magenta.bold('Positionals:')
  })
  .argv;

if (argv._.length === 0) {
  console.error(chalk.red('Missing required string argument'));
  yargs.showHelp();
  process.exit(1);
}

for (const str of argv._) {
  console.log(web3.utils.keccak256(str));
}

