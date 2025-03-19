"use client";
import React from "react";
import { useSelector } from "react-redux";
import { Spinner } from "@heroui/spinner";

import { RootState } from "@/redux/store";

export default function Loading() {
  const loadingWallet = useSelector((state: RootState) => state.wallet.loading);
  const loadingSetting = useSelector(
    (state: RootState) => state.setting.loading
  );
  const loadingToken = useSelector((state: RootState) => state.token.loading);
  if (!loadingWallet && !loadingSetting && !loadingToken) return null;
  return (
    <div className="fixed w-full h-screen border-none backdrop-blur-md z-100">
      <Spinner
        color="success"
        label="Loading..."
        labelColor="success"
        size="lg"
        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
