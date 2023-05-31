"use client";

import { BigNumber, Contract, ethers, providers, utils } from "ethers";
import Head from "next/head";
import React, { useState, useRef, useEffect } from "react";
import Web3Modal from "web3modal";
import { abi, RANDOM_GAME_NFT_CONTRACT_ADDRESS } from "../../constants";
import { FETCH_CREATE_GAME } from "../../queries";
import { subgraphQuery } from "../../utils";

const Home = () => {
  const zero = BigNumber.from("0");
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [entryFee, setEntryFee] = useState<BigNumber>(zero);
  const [maxPlayers, setMaxPlayers] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [players, setPlayers] = useState<[]>([]);
  const [winner, setWinner] = useState<string>("");
  const [logs, setLogs] = useState<string[] | []>([]);
  const web3ModalRef = useRef<Web3Modal | undefined>(undefined);

  /**
   * forceUpdate: Forces React to re-render the page when there are new logs
   */
  const forceUpdate = React.useReducer(() => ({}), {})[1];

  /**
   * connectWallet: Connects the MetaMask wallet
   */
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    if (!web3ModalRef.current) {
      throw new Error("web3ModalRef.current is undefined");
    }

    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Mumbai network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 80001) {
      window.alert("Change the network to Mumbai");
      throw new Error("Change network to Mumbai");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /**
   * startGame: Is called by the owner to start the game
   */
  const startGame = async () => {
    try {
      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const randomGameNFTContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, signer);
      setLoading(true);

      const tx = await randomGameNFTContract.startGame(maxPlayers, entryFee);
      await tx.wait();
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  /**
   * joinGame: Is called by a player to join the game
   */
  const joinGame = async () => {
    try {
      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const randomGameNFTContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, signer);
      setLoading(true);

      const tx = await randomGameNFTContract.joinGame({
        value: entryFee,
      });
      await tx.wait();
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  /**
   * checkIfGameStarted: Checks if the game has started and initializes the logs for the game
   */
  const checkIfGameStarted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const randomGameNFTContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, provider);
      const _gameStarted = await randomGameNFTContract.gameStarted();

      const _gameArray = await subgraphQuery(FETCH_CREATE_GAME());
      const _game = _gameArray.games[0];
      let _logs: any[] = [];

      if (_gameStarted) {
        _logs = [`Game has started with ID: ${_game.id}`];
        if (_game.players?.length > 0) {
          _logs.push(`${_game.players.length} / ${_game.maxPlayers} already joined 👀`);
          _game.players.forEach((player: any) => {
            _logs.push(`${player} joined 🏃‍♂️`);
          });
        }
        setEntryFee(BigNumber.from(_game.entryFee));
        setMaxPlayers(_game.maxPlayers);
      } else if (!gameStarted && _game.winner) {
        _logs = [
          `Last game has ended with ID: ${_game.id}`,
          `Winner is: ${_game.winner} 🎉 `,
          `Waiting for host to start new game....`,
        ];
        setWinner(_game.winner);
      }
      setLogs(_logs);
      setPlayers(_game.players);
      setGameStarted(_gameStarted);
      forceUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getOwner: Calls the contract to retrieve the owner
   */
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const randomGameNFTContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, provider);
      const _owner = await randomGameNFTContract.owner();

      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const address = await signer.getAddress();

      if (address.toLowerCase() === _owner.toLowerCase()) setIsOwner(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "mumbai",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getOwner();
      checkIfGameStarted();
      setInterval(() => {
        checkIfGameStarted();
      }, 2000);
    }
  }, [walletConnected]);

  /**
   * renderButton: Returns a button based on the state of the dapp
   */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wallet
    if (!walletConnected) {
      return (
        <button
          onClick={connectWallet}
          className="rounded-md bg-blue-500 text-white text-base px-4 py-2 w-52 mt-8 mx-4"
        >
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <button className="rounded-md bg-blue-500 text-white text-base px-4 py-2 w-52 mt-8 mx-4">
          Loading...
        </button>
      );
    }
    // Render when the game has started
    if (gameStarted) {
      if (players.length === maxPlayers) {
        return (
          <button
            className="rounded-md bg-blue-500 text-white text-base px-4 py-2 w-52 mt-8 mx-4"
            disabled
          >
            Choosing winner...
          </button>
        );
      }
      return (
        <div>
          <button
            className="rounded-md bg-blue-500 text-white text-base px-4 py-2 w-52 mt-8 mx-4"
            onClick={joinGame}
          >
            Join Game 🚀
          </button>
        </div>
      );
    }
    // Start the game
    if (isOwner && !gameStarted) {
      return (
        <div>
          <input
            type="number"
            className="w-52 h-full p-1 m-2 shadow-md rounded-lg"
            onChange={(e) => {
              // The user will enter the value in ether, we will need to convert
              // it to WEI using parseEther
              setEntryFee(
                BigNumber.from(e.target.value).gt(zero)
                  ? utils.parseEther(e.target.value.toString())
                  : zero
              );
            }}
            placeholder="Entry Fee (ETH)"
          />
          <input
            type="number"
            className="w-52 h-full p-1 m-2 shadow-md rounded-lg"
            onChange={(e) => {
              // The user will enter the value for maximum players that can join the game
              setMaxPlayers(parseInt(e.target.value) ?? 0);
            }}
            placeholder="Max players"
          />
          <button
            className="rounded-md bg-blue-500 text-white text-base px-4 py-2 w-52 mt-8 mx-4"
            onClick={startGame}
          >
            Start Game 🚀
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>LW3Punks</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <div className="min-h-screen flex flex-row justify-center items-center font-mono md:w-full md:flex md:flex-col md:justify-center md:items-center">
        <div className="mx-8">
          <h1 className="text-4xl mb-2">Welcome to Random Winner Game!</h1>
          <div className="text-lg">
            It's a lottery game where a winner is chosen at random and wins the entire lottery pool
          </div>
          {renderButton()}
          {logs &&
            logs.map((log, index) => (
              <div
                className="leading-tight my-4 mx-4 text-base"
                key={index}
              >
                {log}
              </div>
            ))}
        </div>
        <div>
          <img
            src="./randomWinner.png"
            alt="random winner picture"
            className="w-70 h-50 ml-20"
          />
        </div>
      </div>
      <footer className="flex justify-center items-center py-8 border-t-2 border-gray-300">
        Made with &#10084; by Richard H.
      </footer>
    </div>
  );
};

export default Home;
