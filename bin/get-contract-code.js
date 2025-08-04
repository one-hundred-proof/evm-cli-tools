#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getCurrentChainConfig, setupYargs } from '../lib/config-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup command line arguments with yargs
const yargsInstance = setupYargs(yargs(hideBin(process.argv)), 
  `${chalk.bold('Usage:')} $0 [options] <address>`)
  .positional('address', {
    describe: chalk.cyan('Contract address to get source code for'),
    type: 'string',
    demandOption: true
  })
  .example('$0 0x1234...', chalk.green('Get source code for contract 0x1234...'))
  .example('$0 --chain polygon 0x1234...', chalk.green('Get source code for contract on Polygon'));

const argv = yargsInstance.argv;

// Get chain configuration
const chainConfig = getCurrentChainConfig(argv);
const { chainName, scan_api_key, scan_api_domain } = chainConfig;

if (!scan_api_key) {
  console.error(chalk.red(`Please set scan_api_key for chain '${chainName}' in ~/.block-explorer-utils/config.json`));
  exit(1);
}

if (!scan_api_domain) {
  console.error(chalk.red(`Please set scan_api_domain for chain '${chainName}' in ~/.block-explorer-utils/config.json`));
  exit(1);
}

// Get positional arguments
const address = argv._[0];

if (!address) {
  console.error(chalk.red('Missing required address argument'));
  yargsInstance.showHelp();
  exit(1);
}

const mkSourceCodeUrl = (address) => {
  return `https://${scan_api_domain}/api?module=contract&action=getsourcecode&address=${address}&apikey=${scan_api_key}`
}

const mkDirAndWriteFile = (dir, fileName, content) => {
  fs.mkdirSync(path.join(dir, path.dirname(fileName)), { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), content);
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
        dir = fs.mkdtempSync(`${name}-${address}-`);
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


const sliceOffFirstDirectory = (f) => {
  return f.split("/").slice(1).join("/");
}

const getFilesRecursively = (dir) => {
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true}).map(f => {
    if (f.isDirectory()) {
      files = files.concat(getFilesRecursively(path.join(dir, f.name)));
    } else {
      files.push(sliceOffFirstDirectory(path.join(dir,f.name)));
    }
  });
  return files;
};


const r = await getSourceFilesFromAddress(address);
getFilesRecursively(r.dir);
console.log(`Files saved in ${r.dir}`);
