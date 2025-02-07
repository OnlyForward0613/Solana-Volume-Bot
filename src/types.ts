import { Keypair, PublicKey } from "@solana/web3.js"

export type DistributionType = {
  fundWalletSK: string,
  walletSKs: string[],
  solAmounts: number[],
}

export type GatherType = {
  fundWalletSK: string,
  walletSKs: string[],
}

export type sellType = {
  walletAccount: Keypair,
  mintPubKey: PublicKey,
  tokenAmount: bigint,
}

export type LaunchTokenType = {
  devAccount: Keypair,
  sniperAccount: Keypair,
  commonAccounts: Keypair[],
  devAmount: bigint,
  sniperAmount: bigint,
  commonAmounts: bigint[],
  jitoFee: number
}

export interface Wallets {
  fund: string | "";
  dev: string | "";
  sniper: string | "";
  common: string[] | [];
}
