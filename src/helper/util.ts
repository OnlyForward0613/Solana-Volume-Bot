import { Commitment, ComputeBudgetProgram, Connection, Finality, Keypair, LAMPORTS_PER_SOL, PublicKey, SendTransactionError, Transaction, TransactionMessage, VersionedTransaction, VersionedTransactionResponse } from "@solana/web3.js";
import { PriorityFee, TransactionResult } from "../pumpfun/types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import fs from "fs";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import base58 from "bs58";
import { BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import { connection } from "../config";

export const DEFAULT_COMMITMENT: Commitment = "processed";
export const DEFAULT_FINALITY: Finality = "finalized";

export async function printSOLBalance(
  connection: Connection,
  pubKey: PublicKey,
  info: string = ""
) {
  const balance = await connection.getBalance(pubKey);
  console.log(
    `${info ? info + " " : ""}${pubKey.toBase58()}:`,
    balance / LAMPORTS_PER_SOL,
    `SOL`
  );
}

export const printSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  user: PublicKey,
  info: string = ""
) => {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(
      `${info ? info + " " : ""}${user.toBase58()}:`,
      "No Account Found"
    );
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};

export const getSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  owner: PublicKey,
  allowOffCurve: boolean = false
) => {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, owner, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount;
  } catch (e) {}
  return null;
};

export function getOrCreateKeypair(dir: string, keyName: string): Keypair {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const authorityKey = dir + "/" + keyName + ".json";
  if (fs.existsSync(authorityKey)) {
    const data: {
      secretKey: string;
      publicKey: string;
    } = JSON.parse(fs.readFileSync(authorityKey, "utf-8"));
    return Keypair.fromSecretKey(bs58.decode(data.secretKey));
  } else {
    const keypair = Keypair.generate();
    keypair.secretKey;
    fs.writeFileSync(
      authorityKey,
      JSON.stringify({
        secretKey: bs58.encode(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      })
    );
    return keypair;
  }
}

export async function buildTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransaction | null> {
  try {
    let newTx = new Transaction();

    if (priorityFees) {
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: priorityFees.unitLimit,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFees.unitPrice,
      });
      newTx.add(modifyComputeUnits);
      newTx.add(addPriorityFee);
    }
    newTx.add(tx);
    let versionedTx = await buildVersionedTx(connection, payer, newTx, latestBlockhash, commitment);
    versionedTx.sign(signers);
    return versionedTx;
  } catch (err) {
    console.log(`There are some errors in getting versioned transaction, ${err}`);
    return null;
  }
}

export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockhash = latestBlockhash.blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};


export async function sendTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult> {
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }
  newTx.add(tx);
  let versionedTx = await buildVersionedTx(connection, payer, newTx, latestBlockhash, commitment);
  versionedTx.sign(signers);
  try {
    console.log((await connection.simulateTransaction(versionedTx, undefined)))

    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log("sig:", `https://solscan.io/tx/${sig}`);

    let txResult = await getTxDetails(connection, sig, commitment, finality);
    if (!txResult) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
      signature: sig,
      results: txResult,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e as SendTransactionError;
    } else {
      console.error(e);
    }
    return {
      error: e,
      success: false,
    };
  }
}

export const getTxDetails = async (
  connection: Connection,
  sig: string,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransactionResponse | null> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};

export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; // The maximum is inclusive, the minimum is inclusive
}

export const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount + (amount * basisPoints) / 10000n;
};

export const simulateTxBeforeSendBundle = async (
  connection: Connection,
  txs: VersionedTransaction[]
) => {
  // const results = await Promise.all(txs.map(async (tx) => {
  //   try {
  //     const txid = await connection.simulateTransaction(tx, { commitment: DEFAULT_COMMITMENT});
  //     const sig = base58.encode(tx.signatures[0]);
  //     if (txid.value.err) {
  //       console.log(`simulation err, sig: ${sig}`, txid.value.err);
  //       return false;
  //     } else {
  //       console.log(`simulation ok, sig: ${sig}`, txid);
  //       return true;
  //     }
  //   } catch (err) {
  //     console.error('simulation err', err);
  //     return false;
  //   }
  // }))
  // const successNums = results.filter(result => result === true);
  // console.log(successNums);
  // if (successNums.length >= txs.length) {
  //   return true;
  // }
  // return false;

  for (const tx of txs) {
    try {
      const txid = await connection.simulateTransaction(tx, { commitment: 'confirmed'});
      const sig = base58.encode(tx.signatures[0]);
      if (txid.value.err) {
        console.log(`simulation err, sig: ${sig}`, txid.value.err);
        // return false;
      } else {
        console.log(`simulation ok, sig: ${sig}`);
      }
    } catch (err) {
      console.error('simulation err', err);
      return false;
    }
  }
  return true;
}

export const isFundSufficent = async (
  account: PublicKey,
  solAmount: bigint,
  connection: Connection
) => {
  let count = 0;
  while (true) {
    try {
      if (BigInt(await connection.getBalance(account)) < solAmount) {
        return false;
      }
      break;
    } catch (err) {
      console.log(`Errors when getting sol balance of account, ${err}`);
      count++;
      if (count >= 3) {
        console.log("RPC Error or Invalid solana address");
        return false;
      }
    }
  }
  return true;
}

export const calculateWithSlippageSell = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount - (amount * basisPoints) / 10000n;
};

export const createNewPrivateKeyBasedonAssets = (allWallets: string[]) => {
  while (1) {
    const newWalletPrivateKey = bs58.encode(Keypair.generate().secretKey); 
    if (!allWallets.includes(newWalletPrivateKey)) {
      return newWalletPrivateKey;
    }
  }
}

// check if given string is valid solana private key
export const isValidSolanaPrivateKey = (keys: string[]) => {
  console.log(keys);
  try {
    keys.map(key => {
      Keypair.fromSecretKey(bs58.decode(key));
    });
    return true;
  } catch (err) {
    console.log(`Invalid solana address, ${err}`);
    return false;
  }
}