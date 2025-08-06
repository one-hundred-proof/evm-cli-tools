import { Web3 } from 'web3';

// Initialize web3 without a provider since we're only using utility functions
const web3 = new Web3();

/**
 * Format a bytes32 value to different types
 * @param {string} value - The bytes32 value to format
 * @param {string} type - The type to convert to: 'hex', 'decimal', 'address'
 * @returns {string} The formatted value
 */
export function formatBytes32(value, type = 'hex') {
  if (!value) return value;

  if (value.length !== 66) {
    throw new Error("Invalid bytes32 value");
  }

  switch (type) {
    case 'decimal':
      return web3.utils.hexToNumberString(value);
    case 'address':
      try {
        // Amazingly, the web3 package does not have a function to convert a hex string to an address which
        // is why we are forced to use string manipulation.

        // An Ethereum address is the last 20 bytes of the 32 byte value
        // We can directly use web3's hexToAddress which handles the conversion properly
        return web3.utils.toChecksumAddress('0x' + value.slice(26));
      } catch (error) {
        // If conversion fails, return the original value
        return value;
      }
    case 'hex':
    default:
      return value;
  }
}
