"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { AppDispatch, RootState } from "@/redux/store";
import { WalletData } from "@/redux/slices/walletSlice";
// import { mockWalletUpdate } from "@/mock/mock";
import DevWalletComponent from "../DevWalletComponent";
import WalletComponent, { ClickEventProps } from "../WalletComponent";
import {
  getSellPercentage,
  getWallets,
  sellByPercentage,
} from "@/redux/thunks/walletThunks";
import { getNetworkSettings } from "@/redux/thunks/settingThunks";
import useNotifications from "@/hooks/useNotification";
import useAuthenticate from "@/hooks/useAuthenticate";

export default function BundleLabs() {
  useNotifications();
  const key = useAuthenticate();
  const dispatch: AppDispatch = useDispatch();
  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);
  const fundWallet = useSelector(
    (state: RootState) => state.wallet.data.fundWallet
  );
  const snipeWallet = useSelector(
    (state: RootState) => state.wallet.data.snipeWallet
  );
  const devWallet = useSelector(
    (state: RootState) => state.wallet.data.devWallet
  );

  // Refetch wallet state value
  const refetchWallet = useSelector((state: RootState) => state.wallet.refetch);
  useEffect(() => {
    if (refetchWallet && key) dispatch(getWallets({ authKey: key }));
  }, [refetchWallet, key]);

  useEffect(() => {
    if (!key) return;
    dispatch(getSellPercentage({ authKey: key }));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    dispatch(getNetworkSettings({ authKey: key }));
  }, [key]);

  const handleSellTokenByPercentage = ({
    privateKey,
    value,
  }: ClickEventProps) => {
    if (!key) return;
    dispatch(
      sellByPercentage({
        walletSK: privateKey,
        percentage: value,
        authKey: key,
      })
    );
  };

  return (
    <Card className="flex-grow min-w-[600px] bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline outline-[#334155] rounded-lg text-white h-custom-calc overflow-y-auto">
      <CardHeader className="h-1 text-xl px-6 py-6 font-segoe">
        Bundle labs
      </CardHeader>
      <Divider className="bg-[#334155]" />
      <CardBody className="gap-1.5">
        {fundWallet && (
          <WalletComponent
            data={fundWallet}
            onClick={handleSellTokenByPercentage}
          />
        )}
        {snipeWallet && (
          <WalletComponent
            data={snipeWallet}
            onClick={handleSellTokenByPercentage}
          />
        )}
        {wallets &&
          wallets.map((wallet: WalletData, index: number) => (
            <WalletComponent
              key={index}
              index={index}
              data={wallet}
              onClick={handleSellTokenByPercentage}
            />
          ))}
      </CardBody>
      <DevWalletComponent
        data={devWallet}
        onClick={handleSellTokenByPercentage}
      />
    </Card>
  );
}
