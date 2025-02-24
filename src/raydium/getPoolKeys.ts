import { Liquidity, MARKET_STATE_LAYOUT_V3, Market } from "@raydium-io/raydium-sdk";
import { Commitment, Connection, PublicKey } from "@solana/web3.js";

export const RAYDIUM_POOL_V4_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
export const OPENBOOK_ADDRESS = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX');
export const RAYDIUM_AMM_AUTHORITY = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");

export class PoolKeys {
  static SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112'
  
  static SOL_DECIMALS = 9

  static async fetchMarketId(
    connection: Connection, 
    baseMint: PublicKey, 
    quoteMint: PublicKey, 
    commitment: Commitment
  ) {
    let accounts = await connection.getProgramAccounts(
      OPENBOOK_ADDRESS,
      {
        commitment,
        filters: [
          { dataSize: MARKET_STATE_LAYOUT_V3.span },
          {
            memcmp: {
              offset: MARKET_STATE_LAYOUT_V3.offsetOf("baseMint"),
              bytes: baseMint.toBase58(),
            },
          },
          {
            memcmp: {
              offset: MARKET_STATE_LAYOUT_V3.offsetOf("quoteMint"),
              bytes: quoteMint.toBase58(),
            },
          },
        ],
      }
    );
    if(!accounts?.length)
      accounts = await connection.getProgramAccounts(
        OPENBOOK_ADDRESS,
        {
          commitment,
          filters: [
            { dataSize: MARKET_STATE_LAYOUT_V3.span },
            {
              memcmp: {
                offset: MARKET_STATE_LAYOUT_V3.offsetOf("quoteMint"),
                bytes: baseMint.toBase58(),
              },
            },
            {
              memcmp: {
                offset: MARKET_STATE_LAYOUT_V3.offsetOf("baseMint"),
                bytes: quoteMint.toBase58(),
              },
            },
          ],
        }
      );
    return accounts.map(({ account }) => MARKET_STATE_LAYOUT_V3.decode(account.data))[0].ownAddress
  }

  static async fetchMarketInfo(connection: Connection, marketId: PublicKey) {
    const marketAccountInfo = await connection.getAccountInfo(marketId, "processed");
    if (!marketAccountInfo) return null;
    return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
  }

  static async generateV4PoolInfo(baseMint: PublicKey, quoteMint: PublicKey, marketID: PublicKey) {
    const poolInfo = Liquidity.getAssociatedPoolKeys({
      version: 4,
      marketVersion: 3,
      baseMint: baseMint,
      quoteMint: quoteMint,
      baseDecimals: 0,
      quoteDecimals: this.SOL_DECIMALS,
      programId: RAYDIUM_POOL_V4_PROGRAM_ID,
      marketId: marketID,
      marketProgramId: OPENBOOK_ADDRESS,
    });

    return { poolInfo }
  }

  static async fetchPoolKeyInfo(connection: Connection, baseMint: PublicKey, quoteMint: PublicKey) {
    try {
      const marketId = await this.fetchMarketId(connection, baseMint, quoteMint, 'confirmed')
      console.log("market ID", marketId);
      const marketInfo = await this.fetchMarketInfo(connection, marketId);
      if (!marketInfo) throw Error("Failed to get marketInfo from marketId");
      // const baseMintInfo = await connection.getParsedAccountInfo(baseMint, "confirmed") as MintInfo;
      // const baseDecimals = baseMintInfo.value.data.parsed.info.decimals

      const V4PoolInfo = await this.generateV4PoolInfo(baseMint, quoteMint, marketId)
      const lpMintInfo = await connection.getParsedAccountInfo(V4PoolInfo.poolInfo.lpMint, "confirmed") as MintInfo;

      return {
        id: V4PoolInfo.poolInfo.id,
        baseMint: baseMint,
        quoteMint: quoteMint,
        lpMint: V4PoolInfo.poolInfo.lpMint,
        baseDecimals: 6,
        quoteDecimals: this.SOL_DECIMALS,
        lpDecimals: lpMintInfo.value.data.parsed.info.decimals,
        version: 4,
        programId: new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID),
        authority: V4PoolInfo.poolInfo.authority,
        openOrders: V4PoolInfo.poolInfo.openOrders,
        targetOrders: V4PoolInfo.poolInfo.targetOrders,
        baseVault: V4PoolInfo.poolInfo.baseVault,
        quoteVault: V4PoolInfo.poolInfo.quoteVault,
        withdrawQueue: new PublicKey("11111111111111111111111111111111"),
        lpVault: new PublicKey("11111111111111111111111111111111"),
        marketVersion: 3,
        marketProgramId: new PublicKey(OPENBOOK_ADDRESS),
        marketId: marketId,
        marketAuthority: Market.getAssociatedAuthority({ programId: new PublicKey(OPENBOOK_ADDRESS), marketId: marketId }).publicKey,
        marketBaseVault: marketInfo.baseVault,
        marketQuoteVault: marketInfo.quoteVault,
        marketBids: marketInfo.bids,
        marketAsks: marketInfo.asks,
        marketEventQueue: marketInfo.eventQueue,
        lookupTableAccount: PublicKey.default
      }

    } catch (err) {
      console.log(`Errors when getting fetch PoolKeyInfo, ${err}`);
      return null;
    }
  }
}

interface MintInfo {
  value: {
    data: {
      parsed: {
        info: {
          decimals: number
        }
      }
    }
  }
}