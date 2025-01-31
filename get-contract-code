#!/usr/bin/env node

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import { spawnSync } from 'child_process';

dotenv.config();
const { ETHERSCAN_API_KEY, ETHERSCAN_API_DOMAIN } = process.env;

if (!ETHERSCAN_API_KEY) {
  console.log("Please export ETHERSCAN_API_KEY or put it in .env");
  exit(1);
}

let etherscanApiDomain = "api.etherscan.io";
//
if (ETHERSCAN_API_DOMAIN) {
  etherscanApiDomain = ETHERSCAN_API_DOMAIN;
}

if (process.argv.length < 3) {
  console.log(`Usage: ${path.basename(process.argv[1])} <address>`);
  exit(1);
}
const address = process.argv[2];

const mkSourceCodeUrl = (address) => {
  return `https:///${etherscanApiDomain}/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`
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

  let dir = fs.mkdtempSync(`${address}-code-`);
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


