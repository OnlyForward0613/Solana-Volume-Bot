import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { Bundle as JitoBundle } from "jito-ts/dist/sdk/block-engine/types.js";
import {
  SearcherClient,
  searcherClient as jitoSearcherClient,
} from 'jito-ts/dist/sdk/block-engine/searcher.js';
import blockEngine from './blockengine.json';
import { BundleResult } from "jito-ts/dist/gen/block-engine/bundle";
import { simulateTxBeforeSendBundle } from "./util";
import { COMMITMENT_LEVEL, connection } from "../config";
import axios from "axios";
import { BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import base58 from "bs58";

export let bundleResult: boolean;

const decodedKey = new Uint8Array(
  blockEngine as number[],
);
const authKeypair = Keypair.fromSecretKey(decodedKey);
console.log(authKeypair.publicKey.toBase58());

const searcherClients: SearcherClient[] = [];
const BLOCK_ENGINE_URLS = [
  'tokyo.mainnet.block-engine.jito.wtf',
  'mainnet.block-engine.jito.wtf',
  'amsterdam.mainnet.block-engine.jito.wtf',
  'frankfurt.mainnet.block-engine.jito.wtf',
  'ny.mainnet.block-engine.jito.wtf',
];

// for (const url of BLOCK_ENGINE_URLS) {
//   const client = jitoSearcherClient(url, authKeypair);
//   searcherClients.push(client);
// }

// const searcherClient = searcherClients[0];

export async function sendBundle(
  bundledTxns: VersionedTransaction[], 
  latestBlockhash: BlockhashWithExpiryBlockHeight
) {

  const result = await simulateTxBeforeSendBundle(connection, bundledTxns)
  console.log(result);
  bundleResult = false;

	try {
    

		// const bundleId = await searcherClient.sendBundle(new JitoBundle(bundledTxns, bundledTxns.length));
		// console.log(`Bundle ${bundleId} sent.`);

    const oneSig = base58.encode(bundledTxns[0].signatures[0]);

    const serializedTransactions: string[] = [];
    for (let i = 0; i < bundledTxns.length; i++) {
      const serializedTransaction = base58.encode(bundledTxns[i].serialize());
      serializedTransactions.push(serializedTransaction);
    }
    
    const endpoints = [
      'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
      // 'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
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
    

    const successfulResults = results.filter((result) => !(result instanceof Error));

    if (successfulResults.length > 0) {
      console.log(`Successful response`);
      // console.log(`Confirming jito transaction...`);

      const confirmation = await connection.confirmTransaction(
        {
          signature: oneSig,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          blockhash: latestBlockhash.blockhash,
        },
        COMMITMENT_LEVEL,
      );

      console.log(confirmation)

      return { confirmed: !confirmation.value.err, oneSig };
    } else {
      console.log(`No successful responses received for jito`);
    }

    return { confirmed: false };

		///*
		// Assuming onBundleResult returns a Promise<BundleResult>
		// const result = await new Promise((resolve, reject) => {
		// 	searcherClient.onBundleResult(
		// 		(result) => {
		// 			console.log("Received bundle result:", result);
    //       bundleResult = true;
		// 			resolve(result); // Resolve the promise with the result
		// 		},
		// 		(e: Error) => {
		// 			console.error("Error receiving bundle result:", e);
		// 			reject(e); // Reject the promise if there's an error
		// 		}
		// 	);
		// });

		// console.log("Result:", result);
    // return result;
		//*/
	} catch (error) {
		const err = error as any;
		console.error("Error sending bundle:", err.message);

		if (err?.message?.includes("Bundle Dropped, no connected leader up soon")) {
			console.error("Error sending bundle: Bundle Dropped, no connected leader up soon.");
		} else {
			console.error("An unexpected error occurred:", err.message);
		}
	}
}
