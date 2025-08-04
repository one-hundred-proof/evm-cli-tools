#!/usr/bin/env node

// Use Foundry's "cast to-check-sum-address" instead

import web3 from "web3";
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage(`${chalk.bold('Usage:')} $0 [options] <address>...`)
  .positional('address', {
    describe: chalk.cyan('Ethereum address(es) to convert to checksum format'),
    type: 'string',
    demandOption: true
  })
  .example(chalk.bold('$0 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'), `${chalk.green('Convert address to checksum format')}`)
  .example(chalk.bold('$0 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 0x70997970c51812dc3a010c7d01b50e0d17dc79c8'), `${chalk.green('Convert multiple addresses')}`)
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
  console.error(chalk.red('Missing required address argument'));
  yargs.showHelp();
  process.exit(1);
}

for (const address of argv._) {
  try {
    console.log(web3.utils.toChecksumAddress(address));
  } catch (error) {
    console.error(chalk.red(`Error converting address ${address}: ${error.message}`));
  }
}

