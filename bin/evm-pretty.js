#!/usr/bin/env node

import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { setupYargs } from '../lib/config-utils.js';


function formatLargeNumber(num, decimals = 18) {
    let numStr = BigInt(num).toString(); // Convert number to string

    // Ensure the number has at least 'decimals' digits for decimal separation
    if (numStr.length <= decimals) {
        numStr = numStr.padStart(decimals, '0'); // Pad with leading zeros
        return "0_" + numStr;
    }
    let rightPart = numStr.slice(-decimals); // Last 'decimals' digits (treated as "decimal" part)
    let leftPart = numStr.slice(0, -decimals); // Remaining digits on the left

    // Format the left part with underscores every 3 digits
    let formattedLeft = leftPart.replace(/\B(?=(\d{3})+(?!\d))/g, "_");

    return formattedLeft + "_" + rightPart;
}

// CLI support with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)))
    .command('$0 <number> [decimals]', "", (yargs => {
        yargs.positional('number', {
            describe: chalk.cyan('Large number to format (can be in hex or decimal)'),
            type: 'string',
            demandOption: true
        })
        .positional('decimals', {
            describe: chalk.cyan('Number of decimal places'),
            type: 'number',
            default: 18
        })
        .example('$0 1000000000000000000', `${chalk.green('Format 1 ETH (18 decimals)')}`)
        .example('$0 1000000 6', `${chalk.green('Format 1 USDC (6 decimals)')}`)
        .example('$0 0xde0b6b3a7640000', `${chalk.green('Format hex value (1 ETH)')}`)
    }));

const argv = yargsInstance.parse();

if (argv.length === 0) {
    console.error(chalk.red('Missing required number argument'));
    yargsInstance.showHelp();
    process.exit(1);
}

try {
    // Handle hex input by converting to decimal
    const parsedNumber = argv.number.startsWith('0x')
        ? BigInt(argv.number).toString()
        : argv.number;

    console.log(formatLargeNumber(parsedNumber, argv.decimals));
} catch (error) {
    console.error(chalk.red(`Error formatting number: ${error.message}`));
    process.exit(1);
}
