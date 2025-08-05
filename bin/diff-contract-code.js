#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import { spawnSync } from 'child_process';
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
  .command('$0 <address1> <address2> [word-level-diff]', "Do a file by file diff between two contract addresses", (yargs) => {
    yargs.positional('address1', {
      describe: chalk.cyan('First contract address to compare'),
      type: 'string',
      demandOption: true
    })
    .positional('address2', {
      describe: chalk.cyan('Second contract address to compare'),
      type: 'string',
      demandOption: true
    })
    .positional('word-level-diff', {
      describe: chalk.cyan('Use word-level diff (true/false)'),
      type: 'string',
      default: 'true'
    })
    .example('$0 0x1234... 0x5678...', `${chalk.green('Compare contracts with word-level diff')}`)
    .example('$0 --chain polygon 0x1234... 0x5678... false', `${chalk.green('Compare contracts on Polygon with line-level diff')}`)
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

if (!argv.address1 || !argv.address2) {
  console.error(chalk.red('Missing required address arguments'));
  yargsInstance.showHelp();
  exit(1);
}

let wordLevelDiff = true;
if (argv.wordLevelDiffArg && argv.wordLevelDiffArg.toString().toLowerCase()[0] === 'f') {
  wordLevelDiff = false;
}


const r1 = await getSourceFilesFromAddress(argv.address1, scanApiDomain, scanApiKey, chainId);
const r2 = await getSourceFilesFromAddress(argv.address2, scanApiDomain, scanApiKey, chainId);

const rmRf = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true});
}



const files1 = getFilesRecursively(r1.dir);
const files2 = getFilesRecursively(r2.dir);

console.log(chalk.blue(`Address 1: ${chalk.bold(argv.address1)}`));
console.log(chalk.blue(`Address 2: ${chalk.bold(argv.address2)}`));

if (r1.areMultipleFiles && r2.areMultipleFiles) {
  console.log(`\n=== Files at first address but not second ===`);

  for (let i in files1) {
    let f = files1[i];
    if (!files2.includes(f)) {
      console.log(`  - ${f}`);
    }
  }

  console.log(`\n=== Files at second address but not first ===`);
  for (let i in files2) {
    let f = files2[i];
    if (!files1.includes(f)) {
      console.log(`  - ${f}`);
    }
  }
}

if (r1.areMultipleFiles == r2.areMultipleFiles) {
  console.log("\n=== Diffs follow ===")

  const diffFiles = (f1, f2) => {
    let args = ['diff', '--no-index', '--color'];
    if (wordLevelDiff) {
      args = args.concat(['--word-diff=plain']);
    }
    args = args.concat([f1, f2]);

    const result = spawnSync('git', args);
    if (result.status != 0) {
      console.log(result.stdout.toString());
    }

  }

  for (let i in files1) {
    let f = files1[i];
    if (files2.includes(f)) {
      diffFiles(`${r1.dir}/${f}`, `${r2.dir}/${f}`);
    }
  }
} else if (r1.areMultipleFiles) {
  console.log(`Error: Multiple files at address ${argv.address1} and not ${argv.address2}`);
} else if (r2.areMultipleFiles) {
  console.log(`Error: Multiple files at address ${argv.address2} and not ${argv.address1}`);

}

// Clean up
rmRf(r1.dir);
rmRf(r2.dir);
