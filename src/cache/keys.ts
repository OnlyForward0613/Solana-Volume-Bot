export enum Key {
  BLOGS_LATEST = 'BLOGS_LATEST',
}

export enum DynamicKey {
  BLOGS_SIMILAR = 'BLOGS_SIMILAR',
  BLOG = 'BLOG',
  WALLET = 'WALLET',
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

export type DynamicKeyType = `${DynamicKey}_${string}`;

export function getDynamicKey(key: DynamicKey, suffix: string) {
  const dynamic: DynamicKeyType = `${key}_${suffix}`;
  return dynamic;
}
