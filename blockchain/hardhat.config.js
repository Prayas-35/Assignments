require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || '';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

module.exports = {
  solidity: '0.8.24',
  networks: {
    amoy: {
      url: AMOY_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY || ''
  }
};

