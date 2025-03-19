"use client";
import React from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import ModalWalletInfoComponent from "../ModalWalletInfoComponent";
import { WalletData } from "@/redux/slices/walletSlice";

import { toast } from "react-toastify";
import FundWalletInputComponent from "../FundWalletInputComponent";
import {
  removeCommonWallet,
  removeDevWallet,
  removeFundWallet,
  removeSnipeWallet,
} from "@/redux/thunks/walletThunks";

interface WalletsModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function WalletsModal({
  isOpen,
  onOpenChange,
  authKey,
}: WalletsModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const devWallet = useSelector(
    (state: RootState) => state.wallet.data.devWallet
  );
  const fundWallet = useSelector(
    (state: RootState) => state.wallet.data.fundWallet
  );
  const snipeWallet = useSelector(
    (state: RootState) => state.wallet.data.snipeWallet
  );
  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);

  // handle Remove function
  const handleRemoveFundWallet = () => {
    dispatch(removeFundWallet({ authKey }));
  };

  const handleRemoveDevWallet = () => {
    dispatch(removeDevWallet({ authKey }));
  };

  const handleRemoveSnipeWallet = () => {
    dispatch(removeSnipeWallet({ authKey }));
  };

  const handleRemoveWallet = (privateKey: string | undefined) => {
    if (!privateKey) {
      toast.error("No private key provided to remove wallet");
      return;
    }
    dispatch(removeCommonWallet({ privateKey, authKey }));
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
              <ModalHeader className="flex flex-col gap-1">Wallets</ModalHeader>
              <ModalBody>
                {fundWallet?.address ? (
                  <ModalWalletInfoComponent
                    data={fundWallet}
                    onClickRemove={handleRemoveFundWallet}
                  />
                ) : (
                  <FundWalletInputComponent authKey={authKey} />
                )}
                {devWallet?.address && (
                  <ModalWalletInfoComponent
                    data={devWallet}
                    onClickRemove={handleRemoveDevWallet}
                  />
                )}
                {snipeWallet?.address && (
                  <ModalWalletInfoComponent
                    data={snipeWallet}
                    onClickRemove={handleRemoveSnipeWallet}
                  />
                )}
                {wallets &&
                  wallets.map((wallet: WalletData, index: number) => (
                    <ModalWalletInfoComponent
                      key={index}
                      index={index}
                      data={wallet}
                      onClickRemove={handleRemoveWallet}
                    />
                  ))}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
