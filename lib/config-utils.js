import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the config directory and file
export const CONFIG_DIR = path.join(os.homedir(), '.evm-cli-tools');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
export const CONFIG_PATH_DISPLAY = `~/` + path.basename(CONFIG_DIR) + `/config.json`;
const EXAMPLE_CONFIG_PATH = path.join(__dirname, 'config.json.example');

export function setupYargs(yargs) {
  return yargs
    .option('chain', {
      describe: chalk.cyan('Blockchain network to use'),
      type: 'string'
    })
    .option('h', {
      describe: chalk.cyan('Show help'),
    })
    .help()
    .alias('help', 'h')
    .epilogue(chalk.dim('For more information, check the documentation at https://github.com/one-hundred-proof/evm-cli-tools'))
    .wrap(yargs.terminalWidth())
    .parserConfiguration({
      'description-colors': true
    })
    .updateStrings({
      'Options:': chalk.yellow.bold('Options:'),
      'Examples:': chalk.green.bold('Examples:'),
      'Positionals:': chalk.magenta.bold('Positionals:')
    });
  }

// Read the config file
export function readConfig() {
  try {
    // Check if config directory exists, if not create it
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Check if config file exists, if not create it from example
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error(`Config file not found at ${CONFIG_PATH_DISPLAY}`);
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
              "api-key": "YOUR_INFURA_API_KEY",
              "prefix": "https://mainnet.infura.io/v3",
              "scan-api-key": "YOUR_ETHERSCAN_API_KEY",
              "scan-api-domain": "api.etherscan.io"
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
export function getCurrentChainConfig(args) {
  const config = readConfig();

  // Check if chain is specified in command line args
  let chainName = config['current-chain'] || 'ethereum';

  // Handle both old-style array args and new yargs object
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    // New yargs object style
    if (args.chain) {
      chainName = args.chain;
      // Update the current chain in the config file
      updateCurrentChain(chainName);
    }
  } else {
    // Old-style array of arguments
    // Look for --chain argument
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === '--chain') {
        chainName = args[i + 1];
        // Update the current chain in the config file
        updateCurrentChain(chainName);
        break;
      }
    }
  }

  // Verify the chain exists in the config
  if (!config.chains[chainName]) {
    console.error(`Chain "${chainName}" not found in config.json`);
    process.exit(1);
  }

  // Convert snake_case keys to kebab-case for backward compatibility
  const chainConfig = config.chains[chainName];
  const processedConfig = {};

  // Copy all properties, ensuring kebab-case is used
  for (const key in chainConfig) {
    const kebabKey = key.replace(/_/g, '-');
    processedConfig[kebabKey] = chainConfig[key];
  }

  return {
    chainName,
    ...processedConfig
  };
}

// Remove --chain and its value from args
export function cleanArgs(args) {
  const cleanedArgs = [...args];
  for (let i = 0; i < cleanedArgs.length - 1; i++) {
    if (cleanedArgs[i] === '--chain') {
      cleanedArgs.splice(i, 2);
      break;
    }
  }
  return cleanedArgs;
}
/**
 * Displays the current chain being used
 * @param {string} chainName - Name of the chain
 */
export function displayChain(chainName) {
  console.error(chalk.blue(`Chain: ${chalk.bold(chainName)}`));
}
