"use client";
import React, { ChangeEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { generateCommonWallet } from "@/redux/thunks/walletThunks";
import { AppDispatch, RootState } from "@/redux/store";

interface GenerateWalletsModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function GenerateWalletsModal({
  isOpen,
  onOpenChange,
  authKey,
}: GenerateWalletsModalProps) {
  const dispatch: AppDispatch = useDispatch();
  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);

  const [walletCount, setWalletCount] = useState<number>(0);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseFloat(e.target.value);
    if (isNaN(count)) {
      setWalletCount(0);
    }
    setWalletCount(count);
  };

  const handleGenerate = () => {
    if (!walletCount) {
      toast.error("Please enter a number of wallets");
      return;
    }
    if (walletCount < 1 || walletCount > 20) {
      toast.error("Please enter a valid number between 1 and 20");
      return;
    }
    if (wallets.length + walletCount > 20) {
      toast.error("Maximum wallet limit reached");
      return;
    }
    dispatch(generateCommonWallet({nums: walletCount, authKey}));
    onOpenChange();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        placement="top-center"
        onOpenChange={onOpenChange}
        className="bg-[#080A0e] p-3 border-1 border-[#334155]"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Generate Wallets
              </ModalHeader>
              <ModalBody>
                <label htmlFor="walletCount">Number of Wallets</label>
                <input
                  id="walletCount"
                  placeholder="Enter amount (1-20)"
                  type="number"
                  step="0.0001"
                  className="float-input rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                  value={walletCount}
                  onChange={handleChange}
                />
                <Divider className="my-2 bg-[#334155]" />
                <div className="flex gap-3">
                  <Button
                    className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                    onPress={() => onOpenChange()}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                    onPress={handleGenerate}
                  >
                    Generate
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
