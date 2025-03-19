import { getAddressAndBalance } from "@/utils/Web3";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import { updateBuyOption, updateSellOptions } from "../slices/walletSlice";
import { setNotification } from "../slices/notificationSlice";
import { authHeader } from "@/utils/authKey";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface GetWalletsResponse {
  fund?: {
    address: string;
    amount: number;
    privateKey: string;
  };
  snipe?: {
    address: string;
    amount: number;
    privateKey: string;
  };
  dev?: {
    address: string;
    amount: number;
    privateKey: string;
  };
  common?: {
    address: string;
    amount: number;
    privateKey: string;
  }[];
}

export const generateCommonWallet = createAsyncThunk(
  "wallets/generateCommonWallet",
  async (data: { nums: number; authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/generate-wallet/common?nums=${data.nums}`,
        authHeader(data.authKey)
      );
      if (response.data) {
        const walletData = Promise.all(
          response.data.map(async (privateKey: string) => {
            const addressData = await getAddressAndBalance(privateKey);
            return {
              address: addressData?.address,
              amount: addressData?.amount,
              privateKey: privateKey,
            };
          })
        );
        return walletData;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while generating the wallets. Please try again"
      );
    }
  }
);

export const generateDevWallet = createAsyncThunk(
  "wallets/generateDevWallet",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/generate-wallet/dev`,
        authHeader(authKey)
      );
      if (response.data) {
        const walletData = await getAddressAndBalance(response.data);
        return {
          ...walletData,
          privateKey: response.data,
        };
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while generating the dev wallet. Please try again"
      );
    }
  }
);

export const generateSnipeWallet = createAsyncThunk(
  "wallets/generateSnipeWallet",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/generate-wallet/sniper`,
        authHeader(authKey)
      );
      if (response.data) {
        const walletData = await getAddressAndBalance(response.data);
        return {
          ...walletData,
          privateKey: response.data,
        };
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while generating the dev wallet. Please try again"
      );
    }
  }
);

export const importFundWallet = createAsyncThunk(
  "wallets/importFundWallet",
  async (
    data: { privateKey: string; authKey: string },
    { rejectWithValue }
  ) => {
    try {
      const { privateKey, authKey } = data;
      const response = await axios.post(
        `${API_URL}/set-wallet-fund`,
        {
          fund: privateKey,
        },
        authHeader(authKey)
      );
      if (response.data) {
        const walletData = await getAddressAndBalance(privateKey);
        return {
          ...walletData,
          privateKey,
        };
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while generating the dev wallet. Please try again"
      );
    }
  }
);

export const importWallets = createAsyncThunk(
  "wallets/importWallets",
  async (
    wallets: {
      dev?: string;
      sniper?: string;
      common?: string[];
      authKey: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { authKey, ...walletsWithoutAuthKey } = wallets;
      const response = await axios.post(`${API_URL}/set-wallets`, walletsWithoutAuthKey, authHeader(authKey));

      return response.data;
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while importing wallets"
      );
    }
  }
);

export const getWallets = createAsyncThunk(
  "wallets/getWallets",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/get-wallet`,
        authHeader(authKey)
      );
      if (response.data) {
        let res: GetWalletsResponse = {};
        if (response.data.fund) {
          const fundAddressAndAmount = await getAddressAndBalance(
            response.data.fund
          );
          if (
            fundAddressAndAmount?.address &&
            fundAddressAndAmount.amount !== undefined
          ) {
            res.fund = {
              address: fundAddressAndAmount?.address,
              amount: fundAddressAndAmount?.amount,
              privateKey: response.data.fund,
            };
          }
        }
        if (response.data.dev) {
          const devAddressAndAmount = await getAddressAndBalance(
            response.data.dev
          );
          if (
            devAddressAndAmount?.address &&
            devAddressAndAmount.amount !== undefined
          ) {
            res.dev = {
              address: devAddressAndAmount?.address,
              amount: devAddressAndAmount?.amount,
              privateKey: response.data.dev,
            };
          }
        }
        if (response.data.sniper) {
          const snipeAddressAndAmount = await getAddressAndBalance(
            response.data.sniper
          );
          if (
            snipeAddressAndAmount?.address &&
            snipeAddressAndAmount.amount !== undefined
          ) {
            res.snipe = {
              address: snipeAddressAndAmount?.address,
              amount: snipeAddressAndAmount?.amount,
              privateKey: response.data.sniper,
            };
          }
        }

        if (response.data.common && response.data.common.length > 0) {
          const walletsAddressAndAmount:
            | { address: string; amount: number }[]
            | null = await Promise.all(
            response.data.common.map(
              async (pky: string) => await getAddressAndBalance(pky)
            )
          );
          if (walletsAddressAndAmount) {
            res.common = walletsAddressAndAmount
              .map((wal, index) => ({
                address: wal.address,
                amount: wal.amount,
                privateKey: response.data.common[index],
              }))
              .filter(
                (wallets) => wallets?.address && wallets.amount !== undefined
              );
          }
        }
        return res;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while fetching wallets. Please try again"
      );
    }
  }
);

export const removeFundWallet = createAsyncThunk(
  "wallets/removeFundWallet",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${API_URL}/remove-wallet/fund`,
        authHeader(authKey)
      );
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while removing the fund wallet. Please try again"
      );
    }
  }
);

export const removeDevWallet = createAsyncThunk(
  "wallets/removeDevWallet",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${API_URL}/remove-wallet/dev`,
        authHeader(authKey)
      );
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while removing the dev wallet. Please try again"
      );
    }
  }
);

export const removeSnipeWallet = createAsyncThunk(
  "wallets/removeSnipeWallet",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${API_URL}/remove-wallet/sniper`,
        authHeader(authKey)
      );
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while removing the snipe wallet. Please try again"
      );
    }
  }
);

export const removeCommonWallet = createAsyncThunk(
  "wallets/removeCommonWallet",
  async (
    data: { privateKey: string; authKey: string },
    { rejectWithValue }
  ) => {
    try {
      const { authKey, privateKey } = data;
      const response = await axios.post(
        `${API_URL}/remove-wallet/common`,
        {
          wallet: privateKey,
        },
        authHeader(authKey)
      );
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while removing the common wallet. Please try again"
      );
    }
  }
);

export const distributeSol = createAsyncThunk(
  "wallets/distributeSol",
  async (
    {
      sniperAmount,
      commonAmounts,
      authKey,
    }: { sniperAmount: number; commonAmounts: number[]; authKey: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/distributionSol`,
        {
          sniperAmount,
          commonAmounts,
        },
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(
          setNotification({
            message: "Sol distributed successfully",
            signature: response.data,
          })
        );
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while distributing SOL. Please try again"
      );
    }
  }
);

export const refundSolToFundWallet = createAsyncThunk(
  "wallets/refundSolToFundWallet",
  async ({ authKey }: { authKey: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/gather-fund`,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(
          setNotification({
            message: "Sol refunded successfully",
            signature: response.data,
          })
        );
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while refunding SOL to the fund wallet. Please try again"
      );
    }
  }
);

export const refundWSolToFundWallet = createAsyncThunk(
  "wallets/refundWSolToFundWallet",
  async ({ authKey }: { authKey: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/gather-wsol`,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(
          setNotification({
            message: "WSol refunded successfully",
            signature: response.data,
          })
        );
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while refunding WSol to the fund wallet. Please try again"
      );
    }
  }
);

export const sellByPercentage = createAsyncThunk(
  "wallets/selByPercentage",
  async (
    data: { percentage: number; walletSK: string; authKey: string },
    { dispatch, rejectWithValue }
  ) => {
    const { authKey, ...dataWithoutAuthKey } = data;
    try {
      const response = await axios.post(
        `${API_URL}/sell-by-percentage`,
        dataWithoutAuthKey,
        authHeader(data.authKey)
      );
      if (response.data) {
        dispatch(
          setNotification({
            message: "Token is sold by percentage successfully",
            signature: response.data,
          })
        );
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while selecting wallets based on percentage. Please try again"
      );
    }
  }
);

export const setSellPercentage = createAsyncThunk(
  "wallets/setSellPercentage",
  async (
    data: { sellPercentage: number[]; authKey: string },
    { dispatch, rejectWithValue }
  ) => {
    const { authKey, sellPercentage } = data;
    try {
      const response = await axios.post(
        `${API_URL}/set-sell-percentage`,
        {
          sellPercentage,
        },
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(getSellPercentage({ authKey }));
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while setting the sell percentage. Please try again"
      );
    }
  }
);

export const getSellPercentage = createAsyncThunk(
  "wallets/getSellPercentage",
  async ({ authKey }: { authKey: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/get-sell-percentage`,
        authHeader(authKey)
      );
      if (response.data?.setSellPercentage) {
        dispatch(updateSellOptions(response.data.setSellPercentage));
        return response.data.setSellPercentage;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while fetching the sell percentage. Please try again"
      );
    }
  }
);

export const sellByAmount = createAsyncThunk(
  "wallets/sellByAmount",
  async (
    data: { tokenAmount: number; walletSK: string; authKey: string },
    { dispatch, rejectWithValue }
  ) => {
    const { authKey, ...dataWithoutAuthKey } = data;
    try {
      const response = await axios.post(
        `${API_URL}/sell-by-amount`,
        dataWithoutAuthKey,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(
          setNotification({
            message: "Token is sold by amount successfully",
            signature: response.data,
          })
        );
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while selling wallets based on amount. Please try again"
      );
    }
  }
);

export const setBuyAmounts = createAsyncThunk(
  "wallets/setBuyAmounts",
  async (
    data: { dev: number; sniper: number; common: number[]; authKey: string },
    { dispatch, rejectWithValue }
  ) => {
    const { authKey, ...dataWithoutAuthKey } = data;
    try {
      const response = await axios.post(
        `${API_URL}/set-buy-amounts`,
        dataWithoutAuthKey,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(getBuyAmounts({ authKey }));
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while setting the buy amounts. Please try again"
      );
    }
  }
);

export const getBuyAmounts = createAsyncThunk(
  "wallets/getBuyAmounts",
  async ({ authKey }: { authKey: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/get-buy-amounts`,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(updateBuyOption(response.data));
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while fetching the buy amounts. Please try again"
      );
    }
  }
);

export const sellDumpAll = createAsyncThunk(
  "wallets/sellDumpAll",
  async ({ authKey }: { authKey: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/sell-dump-all`,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(
          setNotification({
            message: "Dump all successfully",
            signature: response.data,
          })
        );
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data ||
          "An error occurred while selling all wallets. Please try again"
      );
    }
  }
);
