import { createSlice } from "@reduxjs/toolkit";
import {
  generateWalletMint,
  getTokenMetaData,
  launchToken,
  setTokenMetaData,
} from "../thunks/tokenThunks";
import { toast } from "react-toastify";

export interface TokenData {
  loading: boolean;
  error: null;
  data: {
    name: string;
    symbol: string;
    description: string;
    website: string;
    twitter: string;
    telegram: string;
    image: string;
  };
  metadataUri: string;
  contractAddress: string;
}

export const initTokenData: TokenData = {
  loading: false,
  error: null,
  data: {
    name: "",
    symbol: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    image: "",
  },
  metadataUri: "",
  contractAddress: "",
};

const tokenSlice = createSlice({
  name: "token",
  initialState: initTokenData,
  reducers: {
    updateToken: (state, action) => {
      return { ...state, ...action.payload };
    },
    resetToken: () => {
      return initTokenData;
    },
    updateImage: (state, action) => {
      state.data.image = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(generateWalletMint.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateWalletMint.fulfilled, (state, action) => {
        state.loading = false;
        state.contractAddress = action.payload;
        toast.success("Wallet minted successfully!");
      })
      .addCase(generateWalletMint.rejected, (state, action) => {
        // handle failed token generation
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(setTokenMetaData.pending, (state) => {
        state.loading = true;
      })
      .addCase(setTokenMetaData.fulfilled, (state) => {
        state.loading = false;
        toast.success("Token metadata set successfully!");
      })
      .addCase(setTokenMetaData.rejected, (state, action) => {
        // handle failed token metadata set
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(getTokenMetaData.pending, (state) => {
        state.loading = true;
      })
      .addCase(getTokenMetaData.fulfilled, (state, action) => {
        state.loading = false;
        state.metadataUri = action.payload.metadataUri;
        state.data.name = action.payload.name;
        state.data.symbol = action.payload.symbol;
      })
      .addCase(getTokenMetaData.rejected, (state, action) => {
        // handle failed token metadata fetch
        state.loading = false;
        toast.error(action.payload as string);
      })
      .addCase(launchToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(launchToken.fulfilled, (state, action) => {
        state.loading = false;
        toast.success("Token launched successfully!");
      })
      .addCase(launchToken.rejected, (state, action) => {
        // handle failed token launch
        state.loading = false;
        toast.error(action.payload as string);
      }),
});

export const { updateToken, resetToken, updateImage } = tokenSlice.actions;

export default tokenSlice.reducer;
