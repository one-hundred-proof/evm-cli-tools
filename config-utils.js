import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the config file
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Read the config file
export function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error('Config file not found. Please copy config.json.example to config.json and fill in your API keys.');
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
  
  // Look for --chain argument
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '--chain') {
      chainName = args[i + 1];
      // Update the current chain in the config file
      updateCurrentChain(chainName);
      break;
    }
  }
  
  // Verify the chain exists in the config
  if (!config.chains[chainName]) {
    console.error(`Chain "${chainName}" not found in config.json`);
    process.exit(1);
  }
  
  return {
    chainName,
    ...config.chains[chainName]
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
