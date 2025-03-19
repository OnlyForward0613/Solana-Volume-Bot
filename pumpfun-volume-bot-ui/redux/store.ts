import { configureStore } from "@reduxjs/toolkit"
import walletReducer from "./slices/walletSlice"
import settingReducer from "./slices/settingSlice"
import tokenReducer  from "./slices/tokenSlice"
import notificationReducer from "./slices/notificationSlice"

export function makeStore() {
  return configureStore({
    reducer: {
      wallet: walletReducer,
      setting: settingReducer,
      notification: notificationReducer,
      token: tokenReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  })
}

export const store = makeStore()

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>
