import { ethers } from "hardhat";

async function main() {
  console.log("deploying AccountMarketplace...");
  try {
    const provider = ethers.provider;
    const from = await provider.getSigner().getAddress();

    console.log("from:", from);
    const tokenAddress = ethers.utils.getAddress(
      "0xd4290c61222dc39dd61579b00b9f2509df9cf232"
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
