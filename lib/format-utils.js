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
  
  switch (type) {
    case 'decimal':
      return web3.utils.hexToNumberString(value);
    case 'address':
      // Use web3's toChecksumAddress to properly format the address
      // First ensure we have the last 40 characters (20 bytes)
      const addressHex = '0x' + value.slice(-40).padStart(40, '0');
      try {
        return web3.utils.toChecksumAddress(addressHex);
      } catch (error) {
        // If invalid address, return the simple hex version
        return addressHex;
      }
    case 'hex':
    default:
      return value;
  }
}
