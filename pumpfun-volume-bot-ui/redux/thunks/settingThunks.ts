import { authHeader } from "@/utils/authKey";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const setNetworkSettings = createAsyncThunk(
  "setting/setNetworkSettings",
  async (
    settings: {
      RPC_ENDPOINT: string;
      RPC_WEBSOCKET_ENDPOINT: string;
      JITO_FEE: number;
      authKey: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const { authKey, ...settingsWithoutAuthKey } = settings;
      const response = await axios.post(
        `${API_URL}/set-network`,
        settingsWithoutAuthKey,
        authHeader(authKey)
      );
      dispatch(getNetworkSettings({ authKey: settings.authKey }));
      return response.data;
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data || "Failed to set network settings"
      );
    }
  }
);

export const getNetworkSettings = createAsyncThunk(
  "setting/getNetworkSettings",
  async ({ authKey }: { authKey: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/get-network`,
        authHeader(authKey)
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        (err as AxiosError).response?.data || "Failed to get network settings"
      );
    }
  }
);
