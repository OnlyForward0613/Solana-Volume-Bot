import { Keypair } from "@solana/web3.js"

export type DistributionType = {
  fundWalletSK: string
  walletSKs: string[],
  solAmounts: number[]
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
