
export type CreateAndBuyInputType = {
  devPrivateKey: string,
  buyerPrivateKey: string,
  amount: number
}
export type DistributionType = {
  fundWalletPrivateKey: string
  walletPrivateKeys: string[],
  solAmounts: number[]
}

export interface Wallets {
  fund: string | "";
  dev: string | "";
  sniper: string | "";
  common: string[] | [];
}