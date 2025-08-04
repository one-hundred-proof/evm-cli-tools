import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the config directory and file
const CONFIG_DIR = path.join(os.homedir(), '.block-explorer-utils');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const EXAMPLE_CONFIG_PATH = path.join(path.dirname(__dirname), 'config.json.example');

// Read the config file
export function readConfig() {
  try {
    // Check if config directory exists, if not create it
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Check if config file exists, if not create it from example
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error(`Config file not found at ${CONFIG_PATH}`);
      console.error('Creating example config file. Please edit it with your API keys.');
      
      // Copy example config if it exists
      if (fs.existsSync(EXAMPLE_CONFIG_PATH)) {
        fs.copyFileSync(EXAMPLE_CONFIG_PATH, CONFIG_PATH);
      } else {
        // Create a basic config if example doesn't exist
        const basicConfig = {
          "current-chain": "ethereum",
          "chains": {
            "ethereum": {
              "api_key": "YOUR_INFURA_API_KEY",
              "prefix": "https://mainnet.infura.io/v3",
              "scan_api_key": "YOUR_ETHERSCAN_API_KEY",
              "scan_api_domain": "api.etherscan.io"
            }
          }
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(basicConfig, null, 2));
      }
      process.exit(1);
    }
    
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading config file:', error.message);
    process.exit(1);
  }
}

// Write the config file (only updates the current-chain)
export function updateCurrentChain(chainName) {
  try {
    const config = readConfig();
    
    // Verify the chain exists in the config
    if (!config.chains[chainName]) {
      console.error(`Chain "${chainName}" not found in config.json`);
      process.exit(1);
    }
    
    // Update the current chain
    config['current-chain'] = chainName;
    
    // Write the updated config back to the file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error updating config file:', error.message);
    process.exit(1);
  }
}

// Get the current chain's configuration
export function getCurrentChainConfig(argv) {
  const config = readConfig();
  
  // Check if chain is specified in command line args
  let chainName = argv.chain || config['current-chain'] || 'ethereum';
  
  // Update the current chain in the config file if specified in args
  if (argv.chain) {
    updateCurrentChain(chainName);
  } else {
    // Display which chain we're using on stderr
    console.error(chalk.blue(`Using chain: ${chalk.bold(chainName)}`));
  }
  
  // Verify the chain exists in the config
  if (!config.chains[chainName]) {
    console.error(chalk.red(`Chain "${chainName}" not found in config.json`));
    process.exit(1);
  }
  
  return {
    chainName,
    ...config.chains[chainName]
  };
}

// Setup common yargs configuration
export function setupYargs(yargs, usage) {
  return yargs
    .usage(usage)
    .option('chain', {
      describe: 'Blockchain network to use',
      type: 'string'
    })
    .help()
    .alias('help', 'h')
    .epilogue('For more information, check the documentation at https://github.com/one-hundred-proof/block-explorer-utils')
    .wrap(yargs.terminalWidth());
}
