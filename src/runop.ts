// run a single op
// "yarn run runop [--network ...]"

import hre, { ethers } from "hardhat";
import { AASigner, rpcUserOpSender } from "./AASigner";
import {
  IEntryPoint__factory,
  TradableAccount__factory,
  AccountMarketplace__factory,
} from "../typechain-types";
// import "../test/aa.init";
import { parseEther } from "ethers/lib/utils";
import { providers } from "ethers";
// import { TransactionReceipt } from "@ethersproject/abstract-provider/src.ts/index";

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  console.log("net=", hre.network.name);
  const aa_url = process.env.AA_URL;

  const entryPointAddress = "0x0576a174D229E3cFA37253523E645A78A0C91B57"; // v4

  const provider = ethers.provider;
  const ethersSigner = provider.getSigner();
  const prefundAccountAddress = await ethersSigner.getAddress();
  console.log("from:", prefundAccountAddress);
  const prefundAccountBalance = await provider.getBalance(
    prefundAccountAddress
  );
  console.log(
    "using prefund account address",
    prefundAccountAddress,
    "with balance",
    prefundAccountBalance.toString()
  );

  let sendUserOp;

  if (aa_url != null) {
    const newprovider = new providers.JsonRpcProvider(aa_url);
    sendUserOp = rpcUserOpSender(newprovider, entryPointAddress);
    const supportedEntryPoints: string[] = await newprovider
      .send("eth_supportedEntryPoints", [])
      .then((ret) => ret.map(ethers.utils.getAddress));
    console.log("node supported EntryPoints=", supportedEntryPoints);
    if (!supportedEntryPoints.includes(entryPointAddress)) {
      console.error("ERROR: node", aa_url, "does not support our EntryPoint");
    }
  } else {
    console.error("ERROR: no aa_url");
    return;
  }

  // index is unique for an account (so same owner can have multiple accounts, with different index
  const index = parseInt(process.env.AA_INDEX ?? "0");
  console.log("using account index (AA_INDEX)", index);
  const aasigner = new AASigner(
    ethersSigner,
    entryPointAddress,
    sendUserOp,
    index
  );
  // connect to pre-deployed account
  const accountAddress = "0x7c9520cf619c13d734d85f8c8529b2c2933ade6d"; // TODO
  await aasigner.connectAccountAddress(accountAddress);
  const myAddress = await aasigner.getAddress();
  console.log("aasigner: ", myAddress);

  if ((await provider.getBalance(myAddress)) < parseEther("0.01")) {
    console.log("prefund account");
    await ethersSigner.sendTransaction({
      to: myAddress,
      value: parseEther("0.01"),
    });
  }

  // usually, an account will deposit for itself (that is, get created using eth, run "addDeposit" for itself
  // and from there on will use deposit
  // for testing,
  const entryPoint = IEntryPoint__factory.connect(
    entryPointAddress,
    ethersSigner
  );
  console.log("account address=", myAddress);
  let preDeposit = await entryPoint.balanceOf(myAddress);
  console.log(
    "current deposit=",
    preDeposit,
    "current balance",
    await provider.getBalance(myAddress)
  );

  if (preDeposit.lte(parseEther("0.005"))) {
    console.log("depositing for account");
    await entryPoint.depositTo(myAddress, { value: parseEther("0.01") });
    preDeposit = await entryPoint.balanceOf(myAddress);
  }

  const tradableAccount = TradableAccount__factory.connect(myAddress, aasigner);
  const account_owner = await tradableAccount.owner();
  console.log("current owner: ", account_owner);

  const marketplace = AccountMarketplace__factory.connect(
    "0x0dE2c7F433cbd79C2B6E19fc2dfCeBc335b165cc", // TODO
    aasigner
  );

  const aa = await marketplace.accountRegister(myAddress);
  console.log(aa);

  const ret = await marketplace.register(myAddress); // TODO
  console.log("waiting for mine, hash (reqId)=", ret.hash);
  const rcpt = await ret.wait();
  const netname = await provider.getNetwork().then((net) => net.name);
  if (netname !== "unknown") {
    console.log(
      "rcpt",
      rcpt.transactionHash,
      `https://dashboard.tenderly.co/tx/${netname}/${rcpt.transactionHash}/gas-usage`
    );
  }

  //   const entrypoint_address = await tradableAccount.entryPoint();
  //   console.log("entry point: ", entrypoint_address);

  //   const ret2 = await tradableAccount.changeOwner(
  //     "0x134A8cf663A8ca0eFBe0d2A24C4915216D5a3a68"
  //   );
  //   console.log("waiting for mine, hash (reqId)=", ret2.hash);
  //   const rcpt = await ret2.wait();
  //   const netname = await provider.getNetwork().then((net) => net.name);
  //   if (netname !== "unknown") {
  //     console.log(
  //       "rcpt",
  //       rcpt.transactionHash,
  //       `https://dashboard.tenderly.co/tx/${netname}/${rcpt.transactionHash}/gas-usage`
  //     );
  //   }

  //   const ret = await testCounter.justemit();
  //   console.log("waiting for mine, hash (reqId)=", ret.hash);
  //   const rcpt = await ret.wait();
  //   const netname = await provider.getNetwork().then((net) => net.name);
  //   if (netname !== "unknown") {
  //     console.log(
  //       "rcpt",
  //       rcpt.transactionHash,
  //       `https://dashboard.tenderly.co/tx/${netname}/${rcpt.transactionHash}/gas-usage`
  //     );
  //   }

  //   const testCounter = TestCounter__factory.connect(
  //     testCounterAddress,
  //     aasigner
  //   );

  //   const prebalance = await provider.getBalance(myAddress);
  //   console.log(
  //     "balance=",
  //     prebalance.div(1e9).toString(),
  //     "deposit=",
  //     preDeposit.div(1e9).toString()
  //   );
  //   console.log("estimate direct call", {
  //     gasUsed: await testCounter
  //       .connect(ethersSigner)
  //       .estimateGas.justemit()
  //       .then((t) => t.toNumber()),
  //   });
  //   const ret = await testCounter.justemit();
  //   console.log("waiting for mine, hash (reqId)=", ret.hash);
  //   const rcpt = await ret.wait();
  //   const netname = await provider.getNetwork().then((net) => net.name);
  //   if (netname !== "unknown") {
  //     console.log(
  //       "rcpt",
  //       rcpt.transactionHash,
  //       `https://dashboard.tenderly.co/tx/${netname}/${rcpt.transactionHash}/gas-usage`
  //     );
  //   }
  //   const gasPaid = prebalance.sub(await provider.getBalance(myAddress));
  //   const depositPaid = preDeposit.sub(await entryPoint.balanceOf(myAddress));
  //   console.log(
  //     "paid (from balance)=",
  //     gasPaid.toNumber() / 1e9,
  //     "paid (from deposit)",
  //     depositPaid.div(1e9).toString(),
  //     "gasUsed=",
  //     rcpt.gasUsed
  //   );
  //   console.log("1st run gas used:", await evInfo(rcpt));

  //   const ret1 = await testCounter.justemit();
  //   const rcpt2 = await ret1.wait();
  //   console.log("2nd run:", await evInfo(rcpt2));

  //   async function evInfo(rcpt: TransactionReceipt): Promise<any> {
  //     // TODO: checking only latest block...
  //     const block = rcpt.blockNumber;
  //     const ev = await entryPoint.queryFilter(
  //       entryPoint.filters.UserOperationEvent(),
  //       block
  //     );
  //     // if (ev.length === 0) return {}
  //     return ev.map((event) => {
  //       const { nonce, actualGasUsed } = event.args;
  //       const gasUsed = rcpt.gasUsed.toNumber();
  //       return {
  //         nonce: nonce.toNumber(),
  //         gasPaid,
  //         gasUsed: gasUsed,
  //         diff: gasUsed - actualGasUsed.toNumber(),
  //       };
  //     });
  //   }
})();
