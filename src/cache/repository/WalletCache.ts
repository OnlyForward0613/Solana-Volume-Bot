import { Wallets } from "../../types";
import { DynamicKey, getDynamicKey, WalletKey, WalletType } from "../keys";
import { getArray, getIdFromAuthKey, getValue } from "../query";

export function getDevWalletKey() {
  return getDynamicKey(DynamicKey.WALLET, WalletType.DEV);
}

export function getFundWalletKey() {
  return getDynamicKey(DynamicKey.WALLET, WalletType.FUND);
}

export function getSniperWalletKey() {
  return getDynamicKey(DynamicKey.WALLET, WalletType.SNIPER);
}

export function getCommonWalletKey() {
  return getDynamicKey(DynamicKey.WALLET, WalletType.COMMON);
}

export async function getAllWallets(authKey: string) {
  const id = await getIdFromAuthKey(authKey);
  if (id) {
    const wallets = {
      fund: (await getValue(WalletKey.FUND, authKey)) ?? "",
      dev: (await getValue(WalletKey.DEV, authKey)) ?? "",
      sniper: (await getValue(WalletKey.SNIPER, authKey)) ?? "",
      common: (await getArray<string>(WalletKey.COMMON, authKey)) ?? [],
    } as Wallets;

    const walletSKs: string[] = [];
    if (wallets.fund) walletSKs.push(wallets.fund);
    if (wallets.dev) walletSKs.push(wallets.dev);
    if (wallets.sniper) walletSKs.push(wallets.sniper);
    if (wallets.common.length) walletSKs.push(...wallets.common);
    return walletSKs;
  }
}
