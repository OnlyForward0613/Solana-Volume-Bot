import { Wallets } from "../../types";
import { DynamicKey, getDynamicKey, WalletKey, WalletType } from "../keys";
import { getListRange, getValue } from "../query";

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

export async function getAllWallets() {
  const wallet = {
    fund: await getValue(WalletKey.DEV) ?? "",
    dev: await getValue(WalletKey.DEV) ?? "",
    sniper: await getValue(WalletKey.SNIPER) ?? "",
    common: await getListRange(WalletKey.COMMON) ?? [],
  } as Wallets;

  const walletSKs: string[] = [];
  if (wallet.fund) walletSKs.push(wallet.fund);
  if (wallet.dev) walletSKs.push(wallet.dev);
  if (wallet.sniper) walletSKs.push(wallet.sniper);
  if (wallet.common.length) walletSKs.push(...wallet.common);
  return walletSKs;

}
