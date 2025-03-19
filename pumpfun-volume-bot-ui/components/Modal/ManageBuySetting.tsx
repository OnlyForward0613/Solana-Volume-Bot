"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";

import { Button } from "@heroui/button";
import { getBuyAmounts, setBuyAmounts } from "@/redux/thunks/walletThunks";

interface ManageBuySettingModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function ManageBuySettingModal({
  isOpen,
  onOpenChange,
  authKey,
}: ManageBuySettingModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);
  const devWallet = useSelector(
    (state: RootState) => state.wallet.data.devWallet
  );
  const snipeWallet = useSelector(
    (state: RootState) => state.wallet.data.snipeWallet
  );

  const buyOptions = useSelector((state: RootState) => state.wallet.buyOption);

  const [devAmount, setDevAmount] = useState<number>(buyOptions.dev);
  const [snipeAmount, setSnipeAmount] = useState<number>(buyOptions.sniper);
  const [buyAmounts, setBuyAmount] = useState<number[]>(buyOptions.common);

  useEffect(() => {
    if (authKey) dispatch(getBuyAmounts({ authKey }));
  }, [authKey]);

  useEffect(() => {
    setDevAmount(buyOptions.dev);
    setSnipeAmount(buyOptions.sniper);
    const newAmounts = buyOptions.common
      .concat(buyAmounts)
      .slice(0, wallets.length);
    setBuyAmount(newAmounts);
  }, [wallets]);

  const handleAddDevAmount = (e: ChangeEvent<HTMLInputElement>) => {
    // Parse the input value as a float
    const floatValue = parseFloat(e.target.value);
    // Update the state with the float value
    setDevAmount(floatValue);
  };

  const handleAddSnipeAmount = (e: ChangeEvent<HTMLInputElement>) => {
    // Parse the input value as a float
    const floatValue = parseFloat(e.target.value);

    // Update the state with the float value
    setSnipeAmount(floatValue);
  };

  const handleAddSolAmount = (
    e: ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    // Parse the input value as a float
    const floatValue = parseFloat(e.target.value);
    // Update the state with the float value
    const updatedBuyAmounts = [...buyAmounts];
    updatedBuyAmounts[index] = floatValue;
    setBuyAmount(updatedBuyAmounts);
  };

  const handleSave = () => {
    // Calculate the total SOL amount to distribute

    dispatch(
      setBuyAmounts({
        dev: devAmount,
        sniper: snipeAmount,
        common: buyAmounts,
        authKey,
      })
    );

    onOpenChange();
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
                <div className="flex justify-between items-center">
                  <h3>Manage Buy Setting</h3>
                  <div className="flex gap-5">
                    <Button
                      className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                      onPress={handleSave}
                    >
                      Save
                    </Button>
                    <Button
                      className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                      onPress={onOpenChange}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="w-full flex flex-col px-4 py-4 outline-1 outline outline-[#334155] rounded-lg font-segoe">
                  <div className="flex gap-5">
                    <p>Dev Wallet </p>
                    <p>
                      {devWallet.address.slice(0, 5) +
                        "..." +
                        devWallet.address.slice(-5)}
                    </p>
                    <p>Amount: {devWallet.amount} SOL</p>
                  </div>
                  <input
                    id="devWalletSol"
                    placeholder="Sol amount"
                    type="number"
                    step="0.0001"
                    className="float-input rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                    value={devAmount}
                    onChange={handleAddDevAmount}
                  />
                  <div className="flex gap-5">
                    <p>Snipe Wallet </p>
                    <p>
                      {snipeWallet.address.slice(0, 5) +
                        "..." +
                        snipeWallet.address.slice(-5)}
                    </p>
                    <p>Amount: {snipeWallet.amount} SOL</p>
                  </div>
                  <input
                    id="snipeWalletSol"
                    placeholder="Sol amount"
                    type="number"
                    step="0.0001"
                    className="float-input rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                    value={snipeAmount}
                    onChange={handleAddSnipeAmount}
                  />
                  {wallets &&
                    wallets.map((wallet, index) => (
                      <div key={index}>
                        <div className="flex gap-5">
                          <p>Wallet {index + 1}</p>
                          <p>
                            {wallet.address.slice(0, 5) +
                              "..." +
                              wallet.address.slice(-5)}
                          </p>
                          <p>Amount: {wallet.amount} SOL</p>
                        </div>
                        <input
                          id={`WalletSol-${index + 1}`}
                          placeholder="Sol amount"
                          type="number"
                          step="0.0001"
                          className="float-input w-full rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                          value={buyAmounts[index]}
                          onChange={(e) => handleAddSolAmount(e, index)}
                        />
                      </div>
                    ))}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
