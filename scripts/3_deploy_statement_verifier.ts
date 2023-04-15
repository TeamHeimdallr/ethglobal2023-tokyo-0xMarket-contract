import { ethers } from "hardhat";

async function main() {
  console.log("deploying StatementVerifier...");
  try {
    const provider = ethers.provider;
    const from = await provider.getSigner().getAddress();

    console.log("from:", from);
    const bondTokenAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"; // goerli
    const oov3 = "0x9923D42eF695B5dd9911D05Ac944d4cAca3c4EAB"; // goerli
    const factory = await ethers.getContractFactory("StatementVerifier");
    const ret = await factory.deploy(bondTokenAddress, oov3);

    console.log("==StatementVerifier addr=", ret.address);
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
