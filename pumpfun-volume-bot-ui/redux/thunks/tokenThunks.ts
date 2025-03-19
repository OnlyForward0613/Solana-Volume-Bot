import { authHeader } from "@/utils/authKey";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const generateWalletMint = createAsyncThunk(
  "wallet/generateWalletMint",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/generate-wallet/mint`,
        authHeader(authKey)
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data || "Failed to generate wallet mint"
      );
    }
  }
);

export const setTokenMetaData = createAsyncThunk(
  "wallet/setTokenMetaData",
  async (
    data: {
      name: string;
      symbol: string;
      metadataUri: string;
      mintPrivateKey: string;
      authKey: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    const { authKey, ...dataWithoutAuthKey } = data;
    try {
      const response = await axios.post(
        `${API_URL}/set-token-metadata`,
        dataWithoutAuthKey,
        authHeader(authKey)
      );
      if (response.data) {
        dispatch(getTokenMetaData({ authKey }));
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data || "Failed to set token metadata"
      );
    }
  }
);

export const getTokenMetaData = createAsyncThunk(
  "wallet/getTokenMetaData",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/get-token-metadata`,
        authHeader(authKey)
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data || "Failed to get token metadata"
      );
    }
  }
);

export const launchToken = createAsyncThunk(
  "wallet/launchToken",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/launch-token`, authHeader(authKey));
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data || "Failed to launch token"
      );
    }
  }
);
