#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import chalk from 'chalk';
import yargs from 'yargs';
import web3 from 'web3';
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY, displayChain } from '../lib/config-utils.js';
import { formatBytes32 } from '../lib/format-utils.js';
import { parseSolidityExpression, encodeStorageSlot } from '../lib/solidity-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(process.argv.slice(2)))
  .command('$0 <contract> <slot> [block] [options...]', "2", (yargs) => {
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
    .option('t', {
      alias: 'type',
      describe: chalk.cyan('Output format type (hex, decimal, address)'),
      type: 'string',
      default: 'hex',
      choices: ['h', 'hex', 'd', 'decimal', 'a', 'address']
    })
    .option('k', {
      alias: 'map-key',
      describe: chalk.cyan('Mapping key to encode with the slot (can be used multiple times for nested mappings)'),
      type: 'string',
      array: true
    })
    .option('n', {
      alias: 'num',
      describe: chalk.cyan('Number of contiguous slots to show'),
      type: 'number',
      default: 1
    })
    .example('$0 0x1234... 0', `${chalk.green('Get storage at slot 0')}`)
    .example('$0 --chain polygon 0x1234... 0x1 1000000', `${chalk.green('Get storage at slot 0x1 at block 1000000 on Polygon')}`)
    .example('$0 0x1234... 0 --type decimal', `${chalk.green('Get storage at slot 0 and convert to decimal')}`)
    .example('$0 0x1234... 0 -t address', `${chalk.green('Get storage at slot 0 and format as address')}`)
    .example('$0 0x1234... 0 --map-key 123', `${chalk.green('Get storage for mapping at slot 0 with key 123 (treated as uint256)')}`)
    .example('$0 0x1234... 0 -k "address(0x1234...)"', `${chalk.green('Get storage for mapping at slot 0 with address key')}`)
    .example('$0 0x1234... 0 -k "address(0x1234...)" -k 123', `${chalk.green('Get storage for nested mapping at slot 0 with address and uint256 keys')}`)
    .example('$0 0x1234... 0 --num 5', `${chalk.green('Get storage for 5 contiguous slots starting at slot 0')}`)
})


// Get positional arguments
const argv = yargsInstance.parse();

// Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, "api-key": apiKey, prefix } = chainConfig;

// Display which chain we're using
displayChain(chainName);

if (!apiKey) {
  console.error(chalk.red(`Please set api-key for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  process.exit(1);
}

const rpcPrefix = prefix || "https://mainnet.infura.io/v3";


if (!argv.contract || !argv.slot) {
  console.error(chalk.red('Missing required arguments'));
  yargsInstance.showHelp();
  process.exit(1);
}

// Determine the slot to query
let slotToQuery = argv.slot;

// If mapping keys are provided, encode the slot with the keys
if (argv.mapKey && argv.mapKey.length > 0) {
  try {
    // Process each key in sequence, using the result of each encoding as the slot for the next
    for (let i = 0; i < argv.mapKey.length; i++) {
      const key = argv.mapKey[i];
      const parsedKey = parseSolidityExpression(key);
      console.error(chalk.blue(`Using key ${i+1} type: ${chalk.bold(parsedKey.type)}`));
      
      slotToQuery = encodeStorageSlot(slotToQuery, key);
      console.error(chalk.blue(`Encoded slot after key ${i+1}: ${chalk.bold(slotToQuery)}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error parsing mapping key: ${error.message}`));
    process.exit(1);
  }
}

// Format the keys for display
const keysDisplay = argv.mapKey && argv.mapKey.length > 0 
  ? ' with keys ' + argv.mapKey.map(k => chalk.bold(k)).join(', ') 
  : '';

// Determine how many slots to query
const numSlots = argv.num || 1;

if (numSlots > 1) {
  console.log(chalk.blue(`Storage at ${numSlots} contiguous slots starting at ${chalk.bold(argv.slot)}${keysDisplay}:`));
} else {
  console.log(chalk.blue(`Storage at slot ${chalk.bold(argv.slot)}${keysDisplay}:`));
}

const url = `${rpcPrefix}/${apiKey}`;

// Function to fetch a single slot
const fetchSlot = async (slot) => {
  const body = {
    jsonrpc: "2.0",
    method: "eth_getStorageAt",
    params: [argv.contract, slot, argv.block],
    id: 1
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching storage:', error);
    console.error(chalk.red(`Have you configured your RPC endpoint correctly in ${CONFIG_PATH_DISPLAY}?`));
    process.exit(1);
  }
};

// Fetch all requested slots
(async () => {
  try {
    let choiceHash = { "h": "hex", "d": "decimal", "a": "address"};
    let typ = choiceHash[argv.type] ? choiceHash[argv.type] : argv.type;
    
    for (let i = 0; i < numSlots; i++) {
      // Calculate the current slot
      let currentSlot;
      if (i === 0) {
        // First slot is the one we already calculated
        currentSlot = slotToQuery;
      } else {
        // For subsequent slots, we need to calculate based on the base slot + i
        if (argv.mapKey && argv.mapKey.length > 0) {
          // For mappings with keys, we need to increment the final slot
          // This is different from incrementing the base slot and recalculating
          if (slotToQuery.startsWith('0x')) {
            // Handle hex slots
            currentSlot = BigInt(slotToQuery) + BigInt(i);
            currentSlot = '0x' + currentSlot.toString(16);
          } else {
            // Handle decimal slots
            currentSlot = BigInt(slotToQuery) + BigInt(i);
            currentSlot = currentSlot.toString();
          }
        } else {
          // For regular slots, just add i to the original slot
          if (slotToQuery.startsWith('0x')) {
            // Handle hex slots
            currentSlot = BigInt(slotToQuery) + BigInt(i);
            currentSlot = '0x' + currentSlot.toString(16);
          } else {
            // Handle decimal slots
            currentSlot = BigInt(slotToQuery) + BigInt(i);
            currentSlot = currentSlot.toString();
          }
        }
      }
      
      // Fetch and display the slot
      const result = await fetchSlot(currentSlot);
      const formattedResult = formatBytes32(result, typ);
      
      if (numSlots > 1) {
        // For multiple slots, show the full bytes32 slot value
        console.log(`${chalk.cyan(`Slot ${chalk.bold(currentSlot)}:`)} ${formattedResult}`);
      } else {
        // For a single slot, just show the result
        console.log(formattedResult);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
