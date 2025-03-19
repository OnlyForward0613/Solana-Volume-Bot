"use client";
import React, { ChangeEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Select, SelectItem, SelectSection } from "@heroui/select";
import { sellByAmount } from "@/redux/thunks/walletThunks";
import { AppDispatch, RootState } from "@/redux/store";

interface SellTokenModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function SellTokenModal({
  isOpen,
  onOpenChange,
  authKey,
}: SellTokenModalProps) {
  const dispatch: AppDispatch = useDispatch();
  const wallets = useSelector((state: RootState) => state.wallet.data.wallets);
  const devWallet = useSelector(
    (state: RootState) => state.wallet.data.devWallet
  );
  const snipeWallet = useSelector(
    (state: RootState) => state.wallet.data.snipeWallet
  );
  const [sellAmount, setSellAmount] = useState<number>(0);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseFloat(e.target.value);
    if (isNaN(count)) {
      setSellAmount(0);
    }
    setSellAmount(count);
  };

  const handleGenerate = () => {
    if (!sellAmount) {
      toast.error("Please enter a number of wallets");
      return;
    }
    if (value === undefined || value === "") {
      toast.error("Please select a wallet");
      return;
    }

    dispatch(sellByAmount({ tokenAmount: sellAmount, walletSK: value, authKey }));
    onOpenChange();
  };

  const [value, setValue] = useState<string>("");
  const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value);
  };

  const headingClasses =
    "flex w-full sticky top-1 z-20 py-1.5 px-2 bg-default-100 shadow-small rounded-small";

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
                Sell Tokens
              </ModalHeader>
              <ModalBody>
                <label htmlFor="sellAmount">Token Amount</label>
                <input
                  id="sellAmount"
                  placeholder="Enter token amount"
                  type="number"
                  className="float-input rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                  value={sellAmount}
                  onChange={handleChange}
                />
                <Select
                  className="text-white bg-black"
                  label="Selected Wallet"
                  placeholder="Select a wallet to sell tokens"
                  scrollShadowProps={{
                    isEnabled: false,
                  }}
                  popoverProps={{
                    classNames: {
                      base: "before:bg-[#2e2d2d] bg-[#2e2d2d] text-white",
                      content: "p-0 border-small border-divider bg-[#2e2d2d]",
                    },
                  }}
                  variant="faded"
                  classNames={{
                    value: "text-white group-data-[has-value=true]:text-white",
                  }}
                  style={{ backgroundColor: "#2e2d2d", borderColor: "#334155" }}
                  value={value}
                  onChange={handleSelectionChange}
                >
                  <SelectSection
                    classNames={{
                      heading: headingClasses,
                    }}
                    title="Wallet name"
                  >
                    <SelectItem
                      key={devWallet.privateKey}
                      className="text-white"
                    >
                      Dev Wallet
                    </SelectItem>
                    <SelectItem
                      key={snipeWallet.privateKey}
                      className="text-white"
                    >
                      Snipe Wallet
                    </SelectItem>
                    <>
                      {wallets.map((wallet, index) => (
                        <SelectItem
                          key={wallet.privateKey}
                          className="text-white"
                        >{`Wallet ${index + 1}`}</SelectItem>
                      ))}
                    </>
                  </SelectSection>
                </Select>

                <Divider className="my-2 bg-[#334155]" />
                <div className="flex gap-3">
                  <Button
                    className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                    onPress={handleGenerate}
                    disabled={sellAmount === 0}
                  >
                    Sell
                  </Button>
                  <Button
                    className="bg-gradient-button w-full text-white border-1 border-[#334155]"
                    onPress={() => onOpenChange()}
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
