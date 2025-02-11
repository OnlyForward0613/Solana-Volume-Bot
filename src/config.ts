import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import dotenv from 'dotenv'
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK } from "./pumpfun/sdk";
dotenv.config();

export const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
export const RPC_WEBSOCKET_ENDPOINT = "wss://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
export const PRIVATE_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";

export const COMMITMENT_LEVEL = 'confirmed' as Commitment;
export let connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT
});

console.log("RPC_ENDPOINT", RPC_ENDPOINT);

export const private_connection = new Connection(PRIVATE_RPC_ENDPOINT, {
  commitment: COMMITMENT_LEVEL,
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT
});

export const getProvider = (connection: Connection) => {
  let wallet = new NodeWallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: COMMITMENT_LEVEL })
}
export let anchorProvider = getProvider(connection);

// jito
export const BLOCKENGINE_URL="tokyo.mainnet.block-engine.jito.wtf"
export const JITO_AUTH_KEYPAIR = "66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC"
export const JITO_KEY="66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC"
export const JITO_FEE = 2000000; // 0.002 sol

// pumpfun sdk
export const global_mint = new PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump");
export let sdk = new PumpFunSDK(anchorProvider);


// redis server setting
export const redis = {
  host: process.env.REDIS_HOST || "localhsot",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || '',
};

export const environment = process.env.NODE_ENV || 'development'


// wallet count limit
export const MAX_COMMON_WALLETS_NUMS = 20;

export const configNetwork = (RPC_ENDPOINT: string, RPC_WEBSOCKET_ENDPOINT: string ) => {
  connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT
  });
  anchorProvider = getProvider(connection);
  sdk = new PumpFunSDK(anchorProvider)
}


