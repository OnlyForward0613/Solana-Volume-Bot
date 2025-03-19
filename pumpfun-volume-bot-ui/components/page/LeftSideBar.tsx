"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@heroui/modal";

import ButtonComponent from "../ButtonComponent";
import WalletsModal from "../Modal/WalletsModal";
import SettingsModal from "../Modal/SettingsModal";
import useAuthenticate from "@/hooks/useAuthenticate";

export default function LeftSideBar() {
  const key = useAuthenticate();
  const router = useRouter();
  const [isDashboard, setDashboard] = useState(true);

  // Disclosure for Wallets Modal
  const {
    isOpen: isWalletOpen,
    onOpen: onWalletOpen,
    onOpenChange: onWalletOpenChange,
  } = useDisclosure();
  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onOpenChange: onSettingsOpenChange,
  } = useDisclosure();

  useEffect(() => {
    if (window.location.pathname === "/dashboard") {
      setDashboard(true);
    } else {
      setDashboard(false);
    }
  }, [router]);

  const handlePrepareMint = () => {
    if (window.location.pathname === "/dashboard") {
      setDashboard(false);
      router.push("/dashboard/launch");
    } else {
      setDashboard(true);
      router.push("/dashboard");
    }
  };

  const handleWallets = () => {
    onWalletOpen();
  };

  const handleSettings = () => {
    onSettingsOpen();
  };
  if (!key) {
    return null;
  }

  return (
    <aside className="w-[250px] min-w-[200px] h-full bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline-[#334155] outline rounded-lg p-6 flex flex-col justify-between">
      <WalletsModal
        isOpen={isWalletOpen}
        onOpenChange={onWalletOpenChange}
        authKey={key}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onOpenChange={onSettingsOpenChange}
        authKey={key}
      />
      <ButtonComponent
        content={isDashboard ? "Prepare Mint" : "← Back"}
        onClick={handlePrepareMint}
      />
      <div className="flex flex-col gap-5">
        <ButtonComponent content="Wallets" onClick={handleWallets} />
        <ButtonComponent content="Settings" onClick={handleSettings} />
      </div>
    </aside>
  );
}
