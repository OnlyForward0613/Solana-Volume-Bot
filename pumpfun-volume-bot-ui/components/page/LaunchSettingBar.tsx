"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@heroui/button";
import { useDisclosure } from "@heroui/modal";

import ManageTokenModal from "../Modal/ManageTokenModal";
import ManageSellSettingsModal from "../Modal/ManageSellSettings";
import ButtonComponent from "../ButtonComponent";
import SellTokenModal from "../Modal/SellTokenModal";
import ManageBuySettingModal from "../Modal/ManageBuySetting";
import DumpAllModal from "../Modal/DumpAllModal";
import LaunchTokenModal from "../Modal/LaunchTokenModal";
import { AppDispatch, RootState } from "@/redux/store";
import { getWallets } from "@/redux/thunks/walletThunks";
import useAuthenticate from "@/hooks/useAuthenticate";
import { useRouter } from "next/navigation";

export default function LaunchSettingBar() {
  const router = useRouter();
  const key = useAuthenticate();

  useEffect(() => {
    if (key === undefined) {
      router.push("/");
    }
  }, [key, router]);
  const dispatch: AppDispatch = useDispatch();
  // Refetch wallet state value
  const refetchWallet = useSelector((state: RootState) => state.wallet.refetch);
  useEffect(() => {
    if (refetchWallet && key) dispatch(getWallets({ authKey: key }));
  }, [refetchWallet, key]);

  const {
    isOpen: isManageTokenModalOpen,
    onOpen: onManageTokenOpen,
    onOpenChange: onManageTokenModalChange,
  } = useDisclosure();

  const {
    isOpen: isManageSellSettingsModalOpen,
    onOpenChange: onManageSellSettingsModalChange,
    onOpen: onManageSellSettingsOpen,
  } = useDisclosure();

  const {
    isOpen: isSellTokenModalOpen,
    onOpen: onSellTokenModalOpen,
    onOpenChange: onSellTokenModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isManageBuySettingModalOpen,
    onOpenChange: onManageBuySettingModalChange,
    onOpen: onManageBuySettingOpen,
  } = useDisclosure();

  const {
    isOpen: isLaunchTokenModalOpen,
    onOpenChange: onLaunchTokenModalChange,
    onOpen: onLaunchTokenOpen,
  } = useDisclosure();

  const {
    isOpen: isDumpAllModalOpen,
    onOpenChange: onDumpAllModalChange,
    onOpen: onDumpAllOpen,
  } = useDisclosure();

  const handleManageToken = () => {
    onManageTokenOpen();
  };

  const handleManageBuySettings = () => {
    onManageBuySettingOpen();
  };

  const handleManageSellSettings = () => {
    onManageSellSettingsOpen();
  };

  const handleSellTokens = () => {
    onSellTokenModalOpen();
  };

  const handleDumpAll = () => {
    onDumpAllOpen();
  };

  const handleTokenLaunch = () => {
    onLaunchTokenOpen();
  };

  if (!key) {
    return null;
  }

  return (
    <aside className="w-[250px] min-w-[200px] h-full bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline-[#334155] outline rounded-lg p-6 gap-4 flex flex-col">
      <ManageTokenModal
        isOpen={isManageTokenModalOpen}
        onOpenChange={onManageTokenModalChange}
        authKey={key}
      />
      <ManageBuySettingModal
        isOpen={isManageBuySettingModalOpen}
        onOpenChange={onManageBuySettingModalChange}
        authKey={key}
      />
      <ManageSellSettingsModal
        isOpen={isManageSellSettingsModalOpen}
        onOpenChange={onManageSellSettingsModalChange}
        authKey={key}
      />
      <SellTokenModal
        isOpen={isSellTokenModalOpen}
        onOpenChange={onSellTokenModalOpenChange}
        authKey={key}
      />
      <DumpAllModal
        isOpen={isDumpAllModalOpen}
        onOpenChange={onDumpAllModalChange}
        authKey={key}
      />
      <LaunchTokenModal
        isOpen={isLaunchTokenModalOpen}
        onOpenChange={onLaunchTokenModalChange}
        authKey={key}
      />
      <ButtonComponent content="Manage Token" onClick={handleManageToken} />
      <ButtonComponent
        content="Manage Buy Settings"
        onClick={handleManageBuySettings}
      />
      <ButtonComponent
        content="Manage Sell Settings"
        onClick={handleManageSellSettings}
      />
      <ButtonComponent content="Sell Tokens" onClick={handleSellTokens} />
      <ButtonComponent content="Dump all" onClick={handleDumpAll} />
      <Button
        variant="shadow"
        color="success"
        radius="sm"
        className="mt-auto"
        onPress={handleTokenLaunch}
      >
        Launch{" "}
      </Button>
    </aside>
  );
}
