import { ethers } from "hardhat";

async function main() {
  console.log("deploying AccountMarketplace...");
  try {
    const provider = ethers.provider;
    const from = await provider.getSigner().getAddress();

    console.log("from:", from);
    const tokenAddress = ethers.utils.getAddress(
      "0x68035dd1dfabf2c682f6e1f3eb56db0b26c2e4d5"
    );
    const factory = await ethers.getContractFactory("AccountMarketplace");
    const ret = await factory.deploy(tokenAddress);

    console.log("==AccountMarketplace addr=", ret.address);
  } catch (e) {
    console.log(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
