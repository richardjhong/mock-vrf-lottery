import { ethers, run } from "hardhat";
import "dotenv/config";
import { FEE, LINK_TOKEN, VRF_COORDINATOR, KEY_HASH } from "../constants";

const main = async () => {
  const randomWinnerGame = await ethers.getContractFactory("RandomWinnerGame");
  const deployedRandomWinnerGameContract = await randomWinnerGame.deploy(
    VRF_COORDINATOR,
    LINK_TOKEN,
    KEY_HASH,
    FEE
  );

  await deployedRandomWinnerGameContract.deployed();

  console.log("Verify Contract Address: ", deployedRandomWinnerGameContract.address);

  console.log("Sleeping.....");
  await sleep(30000);

  await run("verify:verify", {
    address: deployedRandomWinnerGameContract.address,
    constructorArguments: [VRF_COORDINATOR, LINK_TOKEN, KEY_HASH, FEE],
  });
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
