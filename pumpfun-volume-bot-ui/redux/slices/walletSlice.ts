import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";

import {
  distributeSol,
  generateCommonWallet,
  generateDevWallet,
  generateSnipeWallet,
  getBuyAmounts,
  getSellPercentage,
  getWallets,
  importFundWallet,
  importWallets,
  refundSolToFundWallet,
  refundWSolToFundWallet,
  removeCommonWallet,
  removeDevWallet,
  removeFundWallet,
  removeSnipeWallet,
  sellByAmount,
  sellByPercentage,
  sellDumpAll,
  setBuyAmounts,
  setSellPercentage,
} from "../thunks/walletThunks";

export interface WalletData {
  name: string;
  address: string;
  amount: number;
  privateKey: string;
  sellOptions: number[];
}

export interface WalletDataSet {
  fundWallet: WalletData;
  snipeWallet: WalletData;
  devWallet: WalletData;
  wallets: WalletData[];
  sellOptions: number[];
}

export interface BuyOption {
  dev: number;
  sniper: number;
  common: number[];
}

export interface initialStateType {
  refetch: boolean;
  loading: boolean;
  error: string | null;
  data: WalletDataSet;
  buyOption: BuyOption;
}

export const initialSellOption: number[] = [25, 50, 75, 100];

const initialState: initialStateType = {
  refetch: true,
  loading: true,
  data: {
    fundWallet: {
      name: "Fund Wallet",
      address: "",
      amount: 0,
      privateKey: "",
      sellOptions: initialSellOption,
    },
    snipeWallet: {
      name: "Snipe Wallet",
      address: "",
      amount: 0,
      privateKey: "",
      sellOptions: initialSellOption,
    },
    devWallet: {
      name: "Dev Wallet",
      address: "",
      amount: 0,
      privateKey: "",
      sellOptions: initialSellOption,
    },
    wallets: [],
    sellOptions: initialSellOption,
  },
  buyOption: {
    dev: 0,
    sniper: 0,
    common: [],
  },
  error: null,
};

const walletSlice = createSlice({
  name: "wallets",
  initialState,
  reducers: {
    updateSellOptions: (state, action) => {
      if (!action.payload.includes(0) && action.payload.length > 0) {
        state.data.devWallet.sellOptions = action.payload;
        state.data.fundWallet.sellOptions = action.payload;
        state.data.snipeWallet.sellOptions = action.payload;
        state.data.wallets.forEach((wallet) => {
          wallet.sellOptions = action.payload;
        });
        state.data.sellOptions = action.payload;
      }
    },
    updateDevWallet: (state, action) => {
      state.data.devWallet = action.payload;
    },
    updateBuyOption: (state, action) => {
      state.buyOption = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateCommonWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateCommonWallet.fulfilled, (state, action) => {
        state.loading = false;
        const wallets: WalletData[] = [];
        if (action.payload) {
          action.payload.forEach(
            async (addressData: {
              address: string;
              amount: number;
              privateKey: string;
            }) => {
              const commonWallet: WalletData = {
                name: "Wallet",
                address: addressData.address,
                privateKey: addressData.privateKey,
                amount: addressData.amount,
                sellOptions: state.data.sellOptions,
              };
              wallets.push(commonWallet);
            }
          );
          state.data.wallets = [...state.data.wallets, ...wallets];
          const newArray = new Array(wallets.length).fill(0);
          state.buyOption.common = [...state.buyOption.common, ...newArray];
          toast.success(`Generated ${action.payload.length} wallets!`);
        } else toast.error("Failed to generate wallets!");
      })
      .addCase(generateCommonWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(generateDevWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateDevWallet.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.address && action.payload?.amount !== undefined) {
          const devWallet: WalletData = {
            name: "Dev Wallet",
            address: action.payload?.address,
            privateKey: action.payload?.privateKey,
            amount: action.payload?.amount,
            sellOptions: state.data.sellOptions,
          };
          state.data.devWallet = devWallet;
          toast.success("Generated dev wallet!");
        } else toast.error("Failed to generate dev wallet");
      })
      .addCase(generateDevWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(generateSnipeWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateSnipeWallet.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.address && action.payload?.amount !== undefined) {
          const snipeWallet: WalletData = {
            name: "Snipe Wallet",
            address: action.payload.address,
            privateKey: action.payload.privateKey,
            amount: action.payload.amount,
            sellOptions: state.data.sellOptions,
          };
          state.data.snipeWallet = snipeWallet;
          toast.success("Generated snipe Wallet!");
        } else toast.error("Failed to generate snipe wallet");
      })
      .addCase(generateSnipeWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(importWallets.pending, (state) => {
        state.loading = true;
      })
      .addCase(importWallets.fulfilled, (state, action) => {
        state.loading = false;
        toast.success("Importing wallets completed");
        state.refetch = true;
      })
      .addCase(importWallets.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(importFundWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(importFundWallet.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.address && action.payload?.amount !== undefined) {
          const fundWallet: WalletData = {
            name: "Fund Wallet",
            address: action.payload.address,
            privateKey: action.payload.privateKey,
            amount: action.payload.amount,
            sellOptions: state.data.sellOptions,
          };
          state.data.fundWallet = fundWallet;
          toast.success("Generated fund wallet!");
        } else toast.error("Failed to generate fund wallet");
      })
      .addCase(importFundWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(getWallets.pending, (state) => {
        state.loading = true;
        state.refetch = false;
      })
      .addCase(getWallets.fulfilled, (state, action) => {
        state.refetch = false;
        state.loading = false;
        if (action.payload?.fund) {
          state.data.fundWallet = {
            name: "Fund Wallet",
            address: action.payload.fund.address,
            privateKey: action.payload.fund.privateKey,
            amount: action.payload.fund.amount,
            sellOptions: state.data.sellOptions,
          };
        }
        if (action.payload?.dev) {
          state.data.devWallet = {
            name: "Dev Wallet",
            address: action.payload.dev.address,
            privateKey: action.payload.dev.privateKey,
            amount: action.payload.dev.amount,
            sellOptions: state.data.sellOptions,
          };
        }
        if (action.payload?.snipe) {
          state.data.snipeWallet = {
            name: "Snipe Wallet",
            address: action.payload.snipe.address,
            privateKey: action.payload.snipe.privateKey,
            amount: action.payload.snipe.amount,
            sellOptions: state.data.sellOptions,
          };
        }

        if (action.payload?.common && action.payload.common.length > 0) {
          state.data.wallets = action.payload.common.map((wallet: any) => ({
            name: "Wallet",
            address: wallet.address,
            privateKey: wallet.privateKey,
            amount: wallet.amount,
            sellOptions: state.data.sellOptions,
          }));
        }
      })
      .addCase(getWallets.rejected, (state, action) => {
        state.refetch = false;
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(removeFundWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeFundWallet.fulfilled, (state, action) => {
        state.loading = false;
        toast.success(action.payload);
        state.data.fundWallet = {
          name: "Fund Wallet",
          address: "",
          privateKey: "",
          amount: 0,
          sellOptions: state.data.sellOptions,
        };
        state.refetch = true;
      })
      .addCase(removeFundWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(removeDevWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeDevWallet.fulfilled, (state, action) => {
        state.loading = false;
        toast.success(action.payload);
        state.data.devWallet = {
          name: "Dev Wallet",
          address: "",
          privateKey: "",
          amount: 0,
          sellOptions: state.data.sellOptions,
        };
        state.refetch = true;
      })
      .addCase(removeDevWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(removeSnipeWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeSnipeWallet.fulfilled, (state, action) => {
        state.loading = false;
        toast.success(action.payload);
        state.data.snipeWallet = {
          name: "Snipe Wallet",
          address: "",
          privateKey: "",
          amount: 0,
          sellOptions: state.data.sellOptions,
        };
        state.refetch = true;
      })
      .addCase(removeSnipeWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(removeCommonWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeCommonWallet.fulfilled, (state, action) => {
        state.loading = false;
        toast.success(action.payload);
        state.refetch = true;
      })
      .addCase(removeCommonWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(distributeSol.pending, (state) => {
        state.loading = true;
      })
      .addCase(distributeSol.fulfilled, (state, action) => {
        state.loading = false;
        toast.success("Successfully distributed");
        state.refetch = true;
      })
      .addCase(distributeSol.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(refundSolToFundWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(refundSolToFundWallet.fulfilled, (state, action) => {
        state.loading = false;
        toast.success("Successfully refunded to fund wallet");
        state.refetch = true;
      })
      .addCase(refundSolToFundWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(refundWSolToFundWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(refundWSolToFundWallet.fulfilled, (state, action) => {
        state.loading = false;
        toast.success("Successfully refunded to fund wallet");
        state.refetch = true;
      })
      .addCase(refundWSolToFundWallet.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(sellByPercentage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sellByPercentage.fulfilled, (state) => {
        state.loading = false;
        toast.success("You successfully sold tokens!");
        state.refetch = true;
      })
      .addCase(sellByPercentage.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(setSellPercentage.pending, (state) => {
        state.loading = true;
      })
      .addCase(setSellPercentage.fulfilled, (state) => {
        state.loading = false;
        toast.success("You successfully saved the sell percentage!");
      })
      .addCase(setSellPercentage.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(getSellPercentage.pending, (state) => {
        state.loading = true;
      })
      .addCase(getSellPercentage.fulfilled, (state, action) => {
        if (!action.payload.includes(0) && action.payload.length > 0) {
          state.data.sellOptions = action.payload;
        }
        state.loading = false;
      })
      .addCase(getSellPercentage.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(sellByAmount.pending, (state) => {
        state.loading = true;
      })
      .addCase(sellByAmount.fulfilled, (state) => {
        state.loading = false;
        toast.success("You successfully sold tokens!");
        state.refetch = true;
      })
      .addCase(sellByAmount.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(setBuyAmounts.pending, (state) => {
        state.loading = true;
      })
      .addCase(setBuyAmounts.fulfilled, (state) => {
        state.loading = false;
        toast.success("You successfully set the buy amounts!");
        state.refetch = true;
      })
      .addCase(setBuyAmounts.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(getBuyAmounts.pending, (state) => {
        state.loading = true;
      })
      .addCase(getBuyAmounts.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(getBuyAmounts.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(sellDumpAll.pending, (state) => {
        state.loading = true;
      })
      .addCase(sellDumpAll.fulfilled, (state) => {
        state.loading = false;
        toast.success("You successfully sold all tokens!");
        state.refetch = true;
      })
      .addCase(sellDumpAll.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
      });
  },
});

export const { updateDevWallet, updateSellOptions, updateBuyOption } =
  walletSlice.actions;

export default walletSlice.reducer;
