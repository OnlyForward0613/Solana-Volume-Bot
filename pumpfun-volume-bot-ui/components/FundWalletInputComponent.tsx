import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@heroui/button";

import { AppDispatch } from "@/redux/store";
import { importFundWallet } from "@/redux/thunks/walletThunks";
import { toast } from "react-toastify";
import { isValidPrivateKey } from "@/utils/Web3";

export default function FundWalletInputComponent({
  authKey,
}: {
  authKey: string;
}) {
  const dispatch: AppDispatch = useDispatch();
  const [privateKey, setPrivateKey] = useState<string>("");

  const handleImportFundWallet = () => {
    if (!privateKey) {
      toast.error("Please enter fund wallet private key");
      return;
    }
    if (!isValidPrivateKey(privateKey)) {
      toast.error("Invalid private key format");
      return;
    }
    dispatch(importFundWallet({ privateKey, authKey }));
  };

  return (
    <div className="flex flex-col gap-2 font-monospace">
      <input
        placeholder="Enter fund wallet private key"
        type="text"
        className="rounded-md bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 border-[#334155]"
        value={privateKey}
        onChange={(e) => setPrivateKey(e.target.value)}
      />
      <Button
        variant="bordered"
        color="default"
        radius="sm"
        className="w-full border-1 text-white border-[#334155]"
        onPress={handleImportFundWallet}
      >
        Import Fund Wallet
      </Button>
    </div>
  );
}
