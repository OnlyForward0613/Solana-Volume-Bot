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
  
  return [wallet.fund, wallet.dev, wallet.sniper, ...wallet.common];

}
