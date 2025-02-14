import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import axios, { AxiosError } from "axios";
import { COMMITMENT_LEVEL, JITO_FEE } from "../config";
import { simulateTxBeforeSendBundle } from "./util";
import { BlockhashWithExpiryBlockHeight } from "@solana/web3.js";


interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export const getJitoTipWallet = () => {
  const tipAccounts = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  ];
  return new PublicKey(tipAccounts[Math.floor(tipAccounts.length * Math.random())])
}

export const jitoWithAxios = async (
  transactions: VersionedTransaction[], 
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  connection: Connection
) => {
  try {
    
      console.log(`Starting Jito transaction execution... transaction count: ${transactions.length}`);
   
    const jitoTxsignature = base58.encode(transactions[0].signatures[0]);
    const serializedTransactions: string[] = [];
    for (let i = 0; i < transactions.length; i++) {
      const serializedTransaction = base58.encode(transactions[i].serialize());
      serializedTransactions.push(serializedTransaction);
    }

    // simulation before sending bundle
    const signatures = [];
    const txSizes = [];
    
    for (let i = 0; i < transactions.length; i++) {
      signatures.push(base58.encode(transactions[i].signatures[0]));
      txSizes.push(transactions[i].serialize().length);
    }

    txSizes.map((txSize, i) => {
      console.log(`tx size: ${i + 1} => ${txSize}`);
    });
    console.log("signatures");
    console.log(signatures);

    // Simulate bundle
    // const simultationResult: any = await simulateTxBeforeSendBundle(connection, [...transactions]);
    // if (!simultationResult) {
    //   console.log("simulation error. plz try again");
    //   return { confirmed: false };
    // }
    // console.log("simulation success");
    // return { confirmed: true, content: "Bundle simulation is Ok" };

    const endpoints = [
      // 'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
    ];

    const requests = endpoints.map((url) =>
      axios.post(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [serializedTransactions],
      })
    );

    console.log('Sending transactions to endpoints...');
    
    const results = await Promise.all(requests.map((p) => p.catch((e) => e)));
    
    // console.log("Jito requests", results);

    const successfulResults = results.filter((result) => !(result instanceof Error));

    if (successfulResults.length > 0) {
      console.log(`Successful response`);
      console.log(`Confirming jito transaction...`);
      const confirmation = await connection.confirmTransaction(
        {
          signature: jitoTxsignature,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          blockhash: latestBlockhash.blockhash,
        },
        "confirmed",
      );

      console.log(confirmation);

      return { confirmed: !confirmation.value.err, content: jitoTxsignature };

    } else {
      console.log(`No successful responses received for jito`);
    }

    return { confirmed: false, content: "Jito bundle is failed" };

  } catch (error) {

    if (error instanceof AxiosError) {
      console.log('Failed to execute jito transaction');
    }
    console.log('Error during transaction execution', error);
    return { confirmed: false, content: "Jito bundle was failed"};
  }
}

export const jitoTipIx = (
  payerPubKey: PublicKey,
  jitoFee: number,
) => {
  return SystemProgram.transfer({
    fromPubkey: payerPubKey,
    toPubkey: getJitoTipWallet(),
    lamports: jitoFee,
  });
}




