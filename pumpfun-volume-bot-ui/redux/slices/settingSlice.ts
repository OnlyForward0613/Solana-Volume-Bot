import { createSlice } from "@reduxjs/toolkit";
import { getNetworkSettings, setNetworkSettings } from "../thunks/settingThunks";
import { toast } from "react-toastify";

export interface SettingData {
  RPC_ENDPOINT: string;
  RPC_WEBSOCKET_ENDPOINT: string;
  JITO_FEE: number;
}

interface SettingSliceType {
  loading: boolean;
  refetch: boolean;
  error: string | null;
  data: SettingData;
}

const initialState: SettingSliceType = {
  loading: false,
  refetch: false,
  error: null,
  data: {
    RPC_ENDPOINT: "https://api.mainnet-beta.solana.com",
    RPC_WEBSOCKET_ENDPOINT: "wss://api.mainnet-beta.solana.com",
    JITO_FEE: 0.0001,
  },
};

const settingSlice = createSlice({
  name: "setting",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
     .addCase(setNetworkSettings.pending, (state) => {
        state.loading = true;
        state.refetch = false;
      })
     .addCase(setNetworkSettings.fulfilled, (state, action) => {
        state.loading = false;
        toast.success(action.payload);
        state.refetch = true;
      })
     .addCase(setNetworkSettings.rejected, (state, action) => {
        state.loading = false;
        toast.error(action.payload as string);
        state.refetch = true;
      })
      .addCase(getNetworkSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(getNetworkSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data.JITO_FEE = action.payload.JITO_FEE;
        state.data.RPC_ENDPOINT = action.payload.RPC_ENDPOINT;
        state.data.RPC_WEBSOCKET_ENDPOINT = action.payload.RPC_WEBSOCKET_ENDPOINT;
        state.refetch = false;
      })
      .addCase(getNetworkSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.refetch = false;
      });
  },
});

export default settingSlice.reducer;
