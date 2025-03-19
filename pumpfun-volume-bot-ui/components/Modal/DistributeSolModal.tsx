"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";

import { toast } from "react-toastify";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { distributeSol } from "@/redux/thunks/walletThunks";

interface DistributeSolModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function DistributeSolModal({
  isOpen,
  onOpenChange,
  authKey,
}: DistributeSolModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);
  const fundWallet = useSelector(
    (state: RootState) => state.wallet.data.fundWallet
  );
  const snipeWallet = useSelector(
    (state: RootState) => state.wallet.data.snipeWallet
  );

  const [snipeAmount, setSnipeAmount] = useState<number>(0);
  const [solAmounts, setSolAmounts] = useState<number[]>(
    new Array<number>(wallets.length).fill(0)
  );

  useEffect(() => {
    setSolAmounts(new Array<number>(wallets.length).fill(0));
  }, [wallets]);

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
    const updatedSolAmounts = [...solAmounts];
    updatedSolAmounts[index] = floatValue;
    setSolAmounts(updatedSolAmounts);
  };

  const handleDistribute = () => {
    // Calculate the total SOL amount to distribute
    const totalSolAmount =
      snipeAmount + solAmounts.reduce((a: number, b: number) => a + b, 0);
    if (totalSolAmount > fundWallet.amount) {
      toast.error("Insufficient SOL in Fund Wallet");
      return;
    }

    dispatch(
      distributeSol({
        sniperAmount: snipeAmount,
        commonAmounts: solAmounts,
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
                Distribute SOL
              </ModalHeader>
              <ModalBody>
                <div className="w-full flex flex-col px-4 py-4 outline-1 outline outline-[#334155] rounded-lg font-segoe overflow-y-auto">
                  <h5 className="mb-2 text-lg">
                    Fund Wallet Balance: {fundWallet.amount} SOL
                  </h5>
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
                          id="snipeWalletSol"
                          placeholder="Sol amount"
                          type="number"
                          step="0.0001"
                          className="float-input w-full rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                          value={solAmounts[index]}
                          onChange={(e) => handleAddSolAmount(e, index)}
                        />
                      </div>
                    ))}
                </div>

                <Divider className="my-2 bg-[#334155]" />
                <div className="flex gap-5">
                  <Button
                    className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                    onPress={handleDistribute}
                  >
                    Distribute
                  </Button>
                  <Button
                    className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                    onPress={onOpenChange}
                  >
                    Cancel
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
