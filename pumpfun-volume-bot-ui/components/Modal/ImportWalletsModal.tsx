"use client";
import React, { useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { WalletData } from "@/redux/slices/walletSlice";

import { toast } from "react-toastify";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import WalletInputComponent from "../WalletInputComponent";
import { importWallets } from "@/redux/thunks/walletThunks";
import { isValidPrivateKey } from "@/utils/Web3";

interface ImportWalletsModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function ImportWalletsModal({
  isOpen,
  onOpenChange,
  authKey,
}: ImportWalletsModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const sellOptions = useSelector(
    (state: RootState) => state.wallet.data.sellOptions
  );

  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);

  const [devWallet, setDevWallet] = useState<WalletData>({
    name: "Dev Wallet",
    address: "",
    privateKey: "",
    amount: 0,
    sellOptions: sellOptions,
  });

  const [snipeWallet, setSnipeWallet] = useState<WalletData>({
    name: "Snipe Wallet",
    address: "",
    privateKey: "",
    amount: 0,
    sellOptions: sellOptions,
  });

  const [newWallets, setNewWallets] = useState<string[]>([]);

  const handleAddWallet = () => {
    if (wallets.length + newWallets.length > 19) {
      toast.error("Max 20 wallets allowed");
      return;
    }
    setNewWallets([...newWallets, ""]);
  };

  const handleWalletInputChange = (wallet: string, id: number) => {
    const cloneNewWallet = [...newWallets];
    cloneNewWallet[id] = wallet;
    setNewWallets(cloneNewWallet);
  };

  const handleWalletInputRemove = (id: number) => {
    const cloneNewWallet = [...newWallets];
    cloneNewWallet.splice(id, 1);
    setNewWallets(cloneNewWallet);
  };

  const handleImportAll = () => {
    const wallets: { dev?: string; sniper?: string; common?: string[] } = {};
    if (devWallet.privateKey) {
      if (!isValidPrivateKey(devWallet.privateKey)) {
        toast.error("Invalid Dev wallet private key format");
        return;
      }
      wallets.dev = devWallet.privateKey;
    }
    if (snipeWallet.privateKey) {
      if (!isValidPrivateKey(snipeWallet.privateKey)) {
        toast.error("Invalid Snipe wallet private key format");
        return;
      }
      wallets.sniper = snipeWallet.privateKey;
    }
    if (newWallets.length > 0) {
      wallets.common = newWallets
        .map((privateKey, index) => {
          if (!isValidPrivateKey(privateKey) && privateKey !== "") {
            toast.error(`Invalid wallet ${index + 1} private key format`);
            return "";
          }
          return privateKey;
        })
        .filter((key) => key !== undefined && key !== null && key !== "");
      if (wallets.common?.length == 0) {
        delete wallets.common;
      }
    }
    if (!wallets || Object.keys(wallets).length === 0) {
      toast.error("Please enter at least one valid wallet private key");
      return;
    }
    dispatch(importWallets({ ...wallets, authKey }));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        placement="top-center"
        onOpenChange={onOpenChange}
        scrollBehavior="inside"
        className="bg-[#080A0e] max-w-[900px] p-3 border-1 border-[#334155]"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Import Wallets
              </ModalHeader>
              <ModalBody>
                <div className="overflow-y-auto outline-1 outline outline-[#334155] rounded-lg">
                  <div className="w-full flex flex-col px-4 py-4 font-segoe">
                    <h5 className="mb-2 text-lg">Special Wallets</h5>
                    <label htmlFor="devWalletPrivateKey">Dev Wallet</label>
                    <input
                      id="devWalletPrivateKey"
                      placeholder="Dev Wallet Private Key"
                      type="text"
                      className="rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 border-[#334155] mb-3"
                      value={devWallet.privateKey}
                      onChange={(e) =>
                        setDevWallet({
                          ...devWallet,
                          privateKey: e.target.value,
                        })
                      }
                    />
                    <label htmlFor="snipeWalletPrivateKey">Snipe Wallet</label>
                    <input
                      id="snipeWalletPrivateKey"
                      placeholder="Snipe Wallet Private Key"
                      type="text"
                      className="rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 border-[#334155]"
                      value={snipeWallet.privateKey}
                      onChange={(e) =>
                        setSnipeWallet({
                          ...snipeWallet,
                          privateKey: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Divider className="my-2 bg-[#334155]" />
                  <div className="w-full flex flex-col px-4 py-4 font-segoe">
                    <h5 className="mb-2 text-lg">Regular Wallets</h5>
                    <Button
                      className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                      onPress={handleAddWallet}
                    >
                      Add Wallet
                    </Button>
                    <p>{wallets.length + newWallets.length}/20 Wallets</p>
                    {newWallets &&
                      newWallets.map((wallet, index: number) => {
                        return (
                          <WalletInputComponent
                            key={index}
                            index={index}
                            wallet={wallet}
                            onChange={handleWalletInputChange}
                            onRemove={handleWalletInputRemove}
                          />
                        );
                      })}
                  </div>
                </div>

                <Divider className="my-2 bg-[#334155]" />
                <Button
                  className="bg-gradient-button w-full h-[50px] text-white border-1 border-[#334155]"
                  onPress={handleImportAll}
                >
                  Import ALL
                </Button>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
