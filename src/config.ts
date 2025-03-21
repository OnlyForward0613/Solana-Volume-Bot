import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import dotenv from 'dotenv'
dotenv.config();
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK } from "./pumpfun/sdk";

export const PRIVATE_RPC_ENDPOINT = process.env.PRIVATE_RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
export const PRIVATE_RPC_WEBSOCKET_ENDPOINT = process.env.PRIVATE_RPC_WEBSOCKET_ENDPOINT || "wss://mainnet.helius-rpc.com/?api-key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

export const COMMITMENT_LEVEL = 'confirmed' as Commitment;

export const private_connection = new Connection(PRIVATE_RPC_ENDPOINT, {
  wsEndpoint: PRIVATE_RPC_WEBSOCKET_ENDPOINT
});

export const getProvider = (connection: Connection) => {
  let wallet = new NodeWallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" })
}
export let private_anchorProvider = getProvider(private_connection);

// jito
export const BLOCKENGINE_URL="xxx..."
// export const JITO_AUTH_KEYPAIR = "xxx"
// export const JITO_KEY="xxx..."
export const DEFAULT_JITO_FEE = 200000; // 0.0002 sol
export const PHOTON_FEE = 1;
export const PHOTON_FEE_RECIPIENT = new PublicKey("AVUCZyuT35YSuj4RH7fwiyPu82Djn2Hfg7y2ND2XcnZH");

// export const lutProviders : { [key: string] : LookupTableProvider } = {};
export const lutProviders: { [key: string] : PublicKey } = {};
export const pumpFunSDKs: { [key: string] : PumpFunSDK } = {};
export const userConnections: { [key: string] : Connection } = {};
export const jitoFees: { [key: string] : number } = {};

// pumpfun sdk
// export let sdk = new PumpFunSDK(private_anchorProvider); // for only 

// redis server setting

export const environment = process.env.NODE_ENV || 'development'

// wallet count limit
export const MAX_COMMON_WALLETS_NUMS = 20;

export const configNetwork = (
  RPC_ENDPOINT: string, 
  RPC_WEBSOCKET_ENDPOINT: 
  string, 
  authKey: string
) => {
  userConnections[authKey] = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT
  });
  let anchorProvider = getProvider(userConnections[authKey]);
  pumpFunSDKs[authKey] = new PumpFunSDK(anchorProvider);
}



