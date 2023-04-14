import { ethers } from "hardhat";

async function main() {
  console.log("deploying TradableAccountFactory...");
  try {
    const provider = ethers.provider;
    const from = await provider.getSigner().getAddress();

    console.log("from:", from);
    const entrypoint = ethers.utils.getAddress(
      "0x0576a174D229E3cFA37253523E645A78A0C91B57"
    );
    const factory = await ethers.getContractFactory("TradableAccountFactory");
    const ret = await factory.deploy(entrypoint);

    console.log("TradableAccountFactory addr:", ret.address);
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
