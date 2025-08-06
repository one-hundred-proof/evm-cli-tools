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
      // Web3 has a built-in method to convert bytes32 to address
      try {
        // First pad to 32 bytes if needed
        const paddedValue = web3.utils.padLeft(value, 64);
        // Then use bytesToHex and slice the last 20 bytes (40 chars + 0x)
        const address = web3.utils.bytesToHex(web3.utils.hexToBytes(paddedValue).slice(-20));
        // Finally convert to checksum address
        return web3.utils.toChecksumAddress(address);
      } catch (error) {
        // If conversion fails, return the original value
        return value;
      }
    case 'hex':
    default:
      return value;
  }
}
