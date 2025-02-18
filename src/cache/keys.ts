export enum Key {
  BLOGS_LATEST = 'BLOGS_LATEST',
  TOKEN_METADATA = 'TOKEN_METADATA',
  MINT_PRIVATEKEY = 'MINT_PRIVATEKEY',
  USER_LIST = 'USER_LIST',
  LUT_ADDRESS = 'LUT_ADDRESS',
}

export enum DynamicKey {
  BLOGS_SIMILAR = 'BLOGS_SIMILAR',
  BLOG = 'BLOG',
  WALLET = 'WALLET',
}

export enum NetworkType {
  RPC_ENDPOINT = 'RPC_ENDPOINT',
  RPC_WEBSOCKET_ENDPOINT = 'RPC_WEBSOCKET_ENDPOINT',
  JITO_FEE = 'JITO_FEE',
}

export enum WalletType {
  COMMON = 'COMMON',
  FUND = 'FUND',
  DEV = 'DEV',
  SNIPER = 'SNIPER',
}

export enum WalletKey {
  COMMON = `${DynamicKey.WALLET}_${WalletType.COMMON}`,
  FUND = `${DynamicKey.WALLET}_${WalletType.FUND}`,
  DEV = `${DynamicKey.WALLET}_${WalletType.DEV}`,
  SNIPER = `${DynamicKey.WALLET}_${WalletType.SNIPER}`,
}

export enum AmountType {
  DEV = 'DEV_AMOUNT',
  SNIPER = 'SNIPER_AMOUNT',
  COMMON = 'COMMON_AMOUNTS',
  FUND = 'FUND_AMOUNT',
  SELL_PERCENTAGE = 'SELL_PERCENTAGE',
  SELL_AMOUNT = 'SELL_AMOUNT',
}

export enum RoleType {
  ADMIN = 'ADMIN',
  USER = 'USER',
}


export type DynamicKeyType = `${DynamicKey}_${string}` | NetworkType | AmountType;

export function getDynamicKey(key: DynamicKey, suffix: string) {
  const dynamic: DynamicKeyType = `${key}_${suffix}`;
  return dynamic;
}
