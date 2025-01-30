import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import dotenv from 'dotenv'
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK } from "./pumpfun/sdk";
dotenv.config();

export const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=662b2530-1747-4909-a65a-8ec18978b03a";
export const RPC_WEBSOCKET_ENDPOINT = "wss://mainnet.helius-rpc.com/?api-key=91d51098-361c-43de-a61d-e691cac6f43b";
export const PRIVATE_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=662b2530-1747-4909-a65a-8ec18978b03a";

export const COMMITMENT_LEVEL = 'confirmed' as Commitment;
export const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT
});

console.log("RPC_ENDPOINT", RPC_ENDPOINT);

export const private_connection = new Connection(PRIVATE_RPC_ENDPOINT, {
  commitment: COMMITMENT_LEVEL,
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT
});

export const getProvider = () => {
  let wallet = new NodeWallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: "finalized" })
}
export const anchorProvider = getProvider();

// jito
export const BLOCKENGINE_URL="tokyo.mainnet.block-engine.jito.wtf"
export const JITO_AUTH_KEYPAIR = "66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC"
export const JITO_KEY="66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC"
export const JITO_FEE = 2000000; // 0.002 sol

// pumpfun sdk
export const global_mint = new PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump");
export const sdk = new PumpFunSDK(anchorProvider);


