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
export function mkSourceCodeUrl(address, scanApiDomain, scanApiKey, chainId) {
  let url = `https://${scanApiDomain}/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${scanApiKey}`;
  return url;
}

/**
 * Creates a URL for getting transaction receipt from a blockchain explorer
 * @param {string} txHash - Transaction hash
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @param {string} chainId - Chain ID
 * @returns {string} URL for the API request
 */
export function mkTxReceiptUrl(txHash, scanApiDomain, scanApiKey, chainId) {
  let url = `https://${scanApiDomain}/v2/api?chainid=${chainId}&module=transaction&action=gettxreceiptbyhash&txhash=${txHash}&apikey=${scanApiKey}`;
  return url;
}

/**
 * Creates a URL for getting block information from a blockchain explorer
 * @param {string} blockNumber - Block number
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @param {string} chainId - Chain ID
 * @returns {string} URL for the API request
 */
export function mkBlockInfoUrl(blockNumber, scanApiDomain, scanApiKey, chainId) {
  let url = `https://${scanApiDomain}/v2/api?chainid=${chainId}&module=block&action=getblockreward&blockno=${blockNumber}&apikey=${scanApiKey}`;
  return url;
}

/**
 * Formats a Unix timestamp to YYYY-MM-DDTHH-MM-SS format in UTC
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
}

/**
 * Creates a URL for getting contract creation transaction
 * @param {string} address - Contract address
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @param {string} chainId - Chain ID
 * @returns {string} URL for the API request
 */
export function mkContractCreationUrl(address, scanApiDomain, scanApiKey, chainId) {
  let url = `https://${scanApiDomain}/v2/api?chainid=${chainId}&module=account&action=txlist&address=${address}&page=1&offset=1&sort=asc&apikey=${scanApiKey}`;
  return url;
}

/**
 * Gets the timestamp of when a contract was deployed
 * @param {string} address - Contract address
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @param {string} chainId - Chain ID
 * @returns {Promise<string>} Formatted timestamp or empty string if not found
 */
export async function getContractDeploymentTimestamp(address, scanApiDomain, scanApiKey, chainId) {
  try {
    // Get the first transaction for this contract address (which should be the creation tx)
    const txListResponse = await fetch(mkContractCreationUrl(address, scanApiDomain, scanApiKey, chainId));
    const txListData = await txListResponse.json();

    if (txListData.status !== "1" || !txListData.result || txListData.result.length === 0) {
      console.error(chalk.yellow(`Could not find creation transaction for ${address}`));
      return "";
    }

    // The first transaction should be the contract creation
    const creationTx = txListData.result[0];
    
    // Check if this is actually a contract creation transaction
    if (creationTx.to !== "" && creationTx.to !== null) {
      console.error(chalk.yellow(`First transaction for ${address} is not a contract creation`));
      return "";
    }

    // Get the timestamp directly from the transaction
    if (creationTx.timeStamp) {
      return formatTimestamp(creationTx.timeStamp);
    }

    // If no timestamp in the transaction, try to get it from the block
    const blockNumber = creationTx.blockNumber;

    // Get the block info to find the timestamp if we don't have it already
    const blockResponse = await fetch(mkBlockInfoUrl(blockNumber, scanApiDomain, scanApiKey, chainId));
    const blockData = await blockResponse.json();

    if (blockData.status !== "1" || !blockData.result || !blockData.result.timeStamp) {
      console.error(chalk.yellow(`Could not find timestamp for block ${blockNumber}`));
      return "";
    }

    return formatTimestamp(blockData.result.timeStamp);
  } catch (error) {
    console.error(chalk.red(`Error getting contract deployment timestamp: ${error.message}`));
    return "";
  }
}

/**
 * Gets source files from a contract address
 *
 * @param {string} address - Contract address
 * @param {string} scanApiDomain - API domain
 * @param {string} scanApiKey - API key
 * @param {string} chainId - ChainId
 * @param {string} fromProxyAddress - Optional proxy address if this is an implementation
 * @param {string} chainName - Name of the blockchain network
 * @returns {Object} Object with directory, flag for multiple files, and implementation address if found
 */
export async function getSourceFilesFromAddress(address, scanApiDomain, scanApiKey, chainId, fromProxyAddress, chainName) {
  const response = await fetch(mkSourceCodeUrl(address, scanApiDomain, scanApiKey, chainId));
  const data = await response.json();

  if (data.status != "1") {
    console.log(`Could not retrieve source code from address ${address}`);
    console.log(data);
    exit(1);
  }

  const result = data.result[0];
  const sourceCode = result.SourceCode;

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
  if (result.ContractFileName == "") {
    console.log(chalk.red(`No code at address ${address}`));
    process.exit(1);
  }

  // Get deployment timestamp
  console.error(chalk.blue(`Fetching deployment timestamp for ${address}...`));
  const timestamp = await getContractDeploymentTimestamp(address, scanApiDomain, scanApiKey, chainId);
  const timestampStr = timestamp ? `-${timestamp}` : '';

  const name = path.basename(result.ContractFileName, ".sol");
  const chainPrefix = chainName ? `${chainName}-` : '';
  const dir = createDirWithFallback(`${chainPrefix}${name}${timestampStr}-${address}${fromProxyAddress ? `-impl-of-${fromProxyAddress}`: ""}`);

  if (areMultipleFiles) {
    for (let fileName in sourceObj) {
      if (dir && sourceObj.hasOwnProperty(fileName)) {
        mkDirAndWriteFile(dir, fileName, sourceObj[fileName].content);
      }
    }
  } else { // Just one flattened source file
    mkDirAndWriteFile(dir, "Source.sol", sourceCode);
  }

  // Check if this is a proxy contract and return the implementation address if it is
  const implementationAddress = (result.Implementation && result.Implementation !== "")
    ? result.Implementation
    : null;

  return {
    dir: dir,
    areMultipleFiles: areMultipleFiles,
    implementationAddress: implementationAddress
  };
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
