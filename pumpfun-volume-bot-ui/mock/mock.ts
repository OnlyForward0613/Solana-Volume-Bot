import {
  updateDevWallet,
} from "@/redux/slices/walletSlice";
import { AppDispatch } from "@/redux/store";
import { useDispatch } from "react-redux";

const mockDevWalletData = {
  name: "Dev Wallet",
  address: "ksfljweirowoqerijoerjiroqwejoreasfwer",
  privateKey: "xxx...",
  amount: 30.12,
  sellOptions: [25, 50, 75, 100],
};

export const mockWalletUpdate = () => {
  const dispatch: AppDispatch = useDispatch();
  dispatch(updateDevWallet(mockDevWalletData));
};
