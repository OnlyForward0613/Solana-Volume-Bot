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
  fundAccount: Keypair,
  devAccount: Keypair,
  sniperAccount: Keypair,
  commonAccounts: Keypair[],
  devAmount: bigint,
  sniperAmount: bigint,
  commonAmounts: bigint[],
}

export type SellDumpAllType = {
  payer: Keypair,
  sellAccounts: Keypair[],
  sellTokenAmounts: bigint[],
  mintPubKey: PublicKey,
}

export interface Wallets {
  fund: string | "";
  dev: string | "";
  sniper: string | "";
  common: string[] | [];
}
