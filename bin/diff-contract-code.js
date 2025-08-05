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
import { getCurrentChainConfig, setupYargs, CONFIG_PATH_DISPLAY } from '../lib/config-utils.js';

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
const { chainName, scan_api_key, scan_api_domain } = chainConfig;

// Display which chain we're using if not specified via command line
if (!argv.chain) {
  console.log(chalk.blue(`Using chain: ${chalk.bold(chainName)}`));
}

if (!scan_api_key) {
  console.error(chalk.red(`Please set scan_api_key for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
  exit(1);
}

if (!scan_api_domain) {
  console.error(chalk.red(`Please set scan_api_domain for chain '${chainName}' in ${CONFIG_PATH_DISPLAY}`));
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
    exit(1);
  }

  const sourceCode = data.result[0].SourceCode;

  let dir = fs.mkdtempSync("temp-");
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



  if (areMultipleFiles) {
    for (let fileName in sourceObj) {
      if (sourceObj.hasOwnProperty(fileName)) {
        mkDirAndWriteFile(dir, fileName, sourceObj[fileName].content);
      }
    }
  } else { // Just one flattened source files
    mkDirAndWriteFile(dir, "Source.sol", sourceCode);
  }
  return { dir: dir, areMultipleFiles: areMultipleFiles };
}

const r1 = await getSourceFilesFromAddress(argv.address1);
const r2 = await getSourceFilesFromAddress(argv.address2);

const rmRf = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true});
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
