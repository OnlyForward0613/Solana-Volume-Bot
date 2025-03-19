import { WalletData } from "@/redux/slices/walletSlice";
import { Keypair } from "@solana/web3.js";
import bs58 from 'bs58';

export const initFundWallet: WalletData = {
  name: "Fund Wallet",
  address: "",
  amount: 0,
  privateKey: "",
  sellOptions: [25, 50, 75, 100],
};

export const initSnipeWallet: WalletData = {
  name: "Snipe Wallet",
  address: "",
  amount: 0,
  privateKey: "",
  sellOptions: [25, 50, 75, 100],
};

export const initDevWallet: WalletData = {
  name: "Dev Wallet",
  address: "",
  amount: 0,
  privateKey: "",
  sellOptions: [25, 50, 75, 100],
};

export const randomKeyGenerator = () => {
  // Generate a new random keypair
  const keypair = Keypair.generate();

  // Get the private key and public key (address)
  const privateKey = bs58.encode(keypair.secretKey);
  const publicKey = keypair.publicKey.toString();

  return { address: publicKey, privateKey }
};
