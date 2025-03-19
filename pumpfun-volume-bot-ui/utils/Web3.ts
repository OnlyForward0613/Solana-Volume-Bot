import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl("devnet"),
  {
    wsEndpoint:
      process.env.NEXT_PUBLIC_RPC_WEBSOCKET_ENDPOINT ||
      "wss://api.devnet.solana.com",
  }
);

export const getWalletAddress = (privateKeyString: string) => {
  try {
    const privateKey = bs58.decode(privateKeyString);

    const keypair = Keypair.fromSecretKey(privateKey);

    return keypair.publicKey.toBase58();
  } catch (err) {
    console.error(err);
    return null;
  }
};

export async function getAddressAndBalance(privateKeyString: string) {
  // Setup a connection to the Solana devnet (you can change to 'mainnet-beta' for main network)
  const publicKeyString = getWalletAddress(privateKeyString);

  try {
    // Create a PublicKey object from the provided string
    const publicKey = new PublicKey(publicKeyString as string);
    // Fetch the balance in lamports
    const balanceInLamports = await connection.getBalance(publicKey);

    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const balanceInSol = balanceInLamports / 1_000_000_000;

    return { address: publicKeyString, amount: balanceInSol };
  } catch (error) {
    console.error("Error fetching balance:", error);
    return null;
  }
}

export function isValidPrivateKey(privateKeyString: string) {
  try {
      // Convert the private key string to a Uint8Array
      const privateKeyArray = bs58.decode(privateKeyString)

      if (privateKeyArray.length !== 64) {
        return false;
      }

      // Create a Keypair from the private key
      Keypair.fromSecretKey(privateKeyArray);

      // If no error is thrown, the private key is valid
      return true;
  } catch (error) {
      // If an error is thrown, the private key is invalid
      console.error("Error fetching private key:", error);
      return false;
  }
}
