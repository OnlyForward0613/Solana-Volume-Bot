
export type DistributionType = {
  fundWalletPrivateKey: string
  walletPrivateKeys: string[],
  solAmounts: number[]
}

export type LaunchTokenType = {
  devSK : string,
  sniperSK: string,
  commonSKs: string[],
  devSolAmount: number,
  sniperSolAmount: number,
  commonSolAmounts: number[],
  jitoFee: number
}

export interface Wallets {
  fund: string | "";
  dev: string | "";
  sniper: string | "";
  common: string[] | [];
}
