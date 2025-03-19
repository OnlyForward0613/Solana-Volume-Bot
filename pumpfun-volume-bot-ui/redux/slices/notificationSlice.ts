import { createSlice } from "@reduxjs/toolkit";

interface NotificationState {
  message: string;
  signature: string;
}

const initNotification: NotificationState = {
  message: "",
  signature: ""
}

const notificationSlice = createSlice({
  name: "notification",
  initialState: initNotification,
  reducers: {
    setNotification: (state, action) => {
      state.message = action.payload.message;
      state.signature = action.payload.signature;
    }
  },
})

export const { setNotification } = notificationSlice.actions;

export default notificationSlice.reducer;