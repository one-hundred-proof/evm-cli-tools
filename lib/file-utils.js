import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { exit } from 'process';

/**
 * Creates a URL for getting source code from a blockchain explorer
 * @param {string} address - Contract address
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @returns {string} URL for the API request
 */
export function mkSourceCodeUrl(address, scanApiDomain, scanApiKey) {
  return `https://${scanApiDomain}/api?module=contract&action=getsourcecode&address=${address}&apikey=${scanApiKey}`;
}

/**
 * Gets source files from a contract address
 * @param {string} address - Contract address
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @returns {Object} Object with directory and flag for multiple files
 */



export async function getSourceFilesFromAddress(address, scanApiDomain, scanApiKey) {
  const response = await fetch(mkSourceCodeUrl(address, scanApiDomain, scanApiKey));
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
  } else { // Just one flattened source file
    mkDirAndWriteFile(dir, "Source.sol", sourceCode);
  }

  return { dir: dir, areMultipleFiles: areMultipleFiles };
}

/**
 * Creates a directory with the given name, adding a suffix only if it already exists
 * @param {string} baseName - Base directory name to create
 * @returns {string} The created directory path
 */
export function createDirWithFallback(baseName) {
  // Try to create the directory with the base name first
  if (!fs.existsSync(baseName)) {
    fs.mkdirSync(baseName, { recursive: true });
    return baseName;
  }

  // If directory already exists, create a temp version with mkdtemp
  console.error(chalk.yellow(`Directory ${chalk.bold(baseName)} already exists, creating with temp suffix`));
  return fs.mkdtempSync(`${baseName}-`);
}

/**
 * Creates a directory and writes a file to it
 * @param {string} dir - Directory to create
 * @param {string} fileName - File name to write
 * @param {string} content - Content to write to the file
 */
export function mkDirAndWriteFile(dir, fileName, content) {
  fs.mkdirSync(path.join(dir, path.dirname(fileName)), { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), content);
}

/**
 * Removes the first directory from a path
 * @param {string} f - Path to slice
 * @returns {string} Path without the first directory
 */
export function sliceOffFirstDirectory(f) {
  return f.split("/").slice(1).join("/");
}

/**
 * Gets all files recursively in a directory
 * @param {string} dir - Directory to search
 * @returns {Array} Array of file paths
 */
export function getFilesRecursively(dir) {
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true}).map(f => {
    if (f.isDirectory()) {
      files = files.concat(getFilesRecursively(path.join(dir, f.name)));
    } else {
      files.push(sliceOffFirstDirectory(path.join(dir, f.name)));
    }
  });
  return files;
}
