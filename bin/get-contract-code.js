#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY, displayChain } from '../lib/config-utils.js';
import { createDirWithFallback, mkDirAndWriteFile, sliceOffFirstDirectory, getFilesRecursively } from '../lib/file-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)))
  .command('$0 <address>', "Get contract code for an address", (yargs) => {
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
const { chainName, "scan-api-key": scanApiKey, "scan-api-domain": scanApiDomain } = chainConfig;

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

const mkSourceCodeUrl = (address) => {
  return `https://${scanApiDomain}/api?module=contract&action=getsourcecode&address=${argv.address}&apikey=${scanApiKey}`
}


// Returns directory and flag whether it is multiple files or not
const getSourceFilesFromAddress = async (address) => {
  const response = await fetch(mkSourceCodeUrl(address));

  const data = await response.json();

  if (data.status != "1") {
    console.log(`Could not retrieve source code from address ${address}`);
    console.log(data);
    exit(1);
  }

  const sourceCode = data.result[0].SourceCode;

  let areMultipleFiles = false;

  let sourceObj;
  if (sourceCode.slice(0,2) == "{{") {
    try {
      sourceObj = JSON.parse(sourceCode.slice(1,sourceCode.length - 1)).sources;
      areMultipleFiles = true;
    } catch (e) {
      areMultipleFiles = false;
    }
  }

  let name;
  let dir;

  if (areMultipleFiles) {
    for (let fileName in sourceObj) {
      if (!name) {
        name = path.basename(fileName, ".sol");
        dir = createDirWithFallback(`${name}-${address}`);
      }
      if (dir && sourceObj.hasOwnProperty(fileName)) {
        mkDirAndWriteFile(dir, fileName, sourceObj[fileName].content);
      }
    }
  } else { // Just one flattened source files
    mkDirAndWriteFile(dir, "Source.sol", sourceCode);
  }
  return { dir: dir, areMultipleFiles: areMultipleFiles };
}




const r = await getSourceFilesFromAddress(argv.address);
getFilesRecursively(r.dir);
console.log(chalk.yellow(`Files saved in ${chalk.bold(r.dir)}`));

