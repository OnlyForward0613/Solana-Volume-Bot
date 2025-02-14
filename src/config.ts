import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import dotenv from 'dotenv'
dotenv.config();
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK } from "./pumpfun/sdk";
// import { LookupTableProvider } from "./helper/lutProvider";

// export const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
// export const RPC_WEBSOCKET_ENDPOINT = "wss://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
export const PRIVATE_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
export const PRIVATE_RPC_WEBSOCKET_ENDPOINT = "wss://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";

export const COMMITMENT_LEVEL = 'finalized' as Commitment;

export const private_connection = new Connection(PRIVATE_RPC_ENDPOINT, {
  wsEndpoint: PRIVATE_RPC_WEBSOCKET_ENDPOINT
});

export const getProvider = (connection: Connection) => {
  let wallet = new NodeWallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" })
}
export let private_anchorProvider = getProvider(private_connection);

// jito
export const BLOCKENGINE_URL="tokyo.mainnet.block-engine.jito.wtf"
export const JITO_AUTH_KEYPAIR = "66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC"
export const JITO_KEY="66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC"
export const JITO_FEE = 2000000; // 0.0002 sol

// pumpfun sdk
// export let sdk = new PumpFunSDK(private_anchorProvider); // for only 

// redis server setting
export const redis = {
  host: process.env.REDIS_HOST || "localhsot",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || '',
};

export const environment = process.env.NODE_ENV || 'development'

// wallet count limit
export const MAX_COMMON_WALLETS_NUMS = 20;

export const configNetwork = (RPC_ENDPOINT: string, RPC_WEBSOCKET_ENDPOINT: string, authKey: string) => {
  userConnections[authKey] = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT
  });
  let anchorProvider = getProvider(userConnections[authKey]);
  pumpFunSDKs[authKey] = new PumpFunSDK(anchorProvider);
}

// export const lutProviders : { [key: string] : LookupTableProvider } = {};
export const lutProviders: { [key: string] : PublicKey } = {};
export const pumpFunSDKs: { [key: string] : PumpFunSDK } = {};
export const userConnections: { [key: string] : Connection } = {};

