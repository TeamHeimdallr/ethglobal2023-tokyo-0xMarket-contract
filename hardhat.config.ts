import { HardhatUserConfig } from "hardhat/config";
import "hardhat-deploy";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const privateKey: string | undefined = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          optimizer: { enabled: true, runs: 1000000 },
        },
      },
    ],
  },
  defaultNetwork: "goerli",
  networks: {
    hardhat: {},
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      accounts: [privateKey],
    },
    mumbai: {
      url: "https://rpc.ankr.com/polygon_mumbai",
      accounts: [privateKey],
    },
    scrollalpha: {
      url: "https://alpha-rpc.scroll.io/l2",
      accounts: [privateKey],
    }
  },
};

export default config;
