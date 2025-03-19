"use client";
import React, { useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useDispatch } from "react-redux";
import { updateSellOptions } from "@/redux/slices/walletSlice";

import { toast } from "react-toastify";
import { Button } from "@heroui/button";
import { AppDispatch } from "@/redux/store";
import { setSellPercentage } from "@/redux/thunks/walletThunks";

interface ManageSellSettingsModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function ManageSellSettingsModal({
  isOpen,
  onOpenChange,
  authKey,
}: ManageSellSettingsModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const [solPercentages, setSolPercentages] = useState<number[]>([0, 0, 0, 0]);

  const handleSave = () => {
    if (solPercentages.includes(0)) {
      toast.error("Sell token value must not be 0");
      return;
    }
    dispatch(setSellPercentage({ sellPercentage: solPercentages, authKey }));
    onOpenChange();
  };

  const handleClose = () => {
    onOpenChange();
  };

  const handleSolPercentageChange = (value: string | null, index: number) => {
    if (!value) {
      return;
    }
    const floatValue = parseFloat(value);
    const updatedSolPercentages = [...solPercentages];
    updatedSolPercentages[index] = floatValue;
    setSolPercentages(updatedSolPercentages);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        placement="top-center"
        onOpenChange={onOpenChange}
        hideCloseButton
        scrollBehavior="inside"
        className="bg-[#080A0e] max-w-[900px] p-3 border-1 border-[#334155]"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex justify-between">
                <h3>Sell Settings</h3>

                <div className="gap-5 flex">
                  <Button
                    className="bg-gradient-button text-white border-1 border-[#334155]"
                    onPress={handleSave}
                  >
                    Save
                  </Button>
                  <Button
                    className="bg-gradient-button text-white border-1 border-[#334155]"
                    onPress={handleClose}
                  >
                    Close
                  </Button>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="w-full flex flex-col px-4 py-4 outline-1 outline outline-[#334155] rounded-lg font-segoe">
                  <h5 className="mb-2 text-lg">Customize Sell Percentages</h5>
                  {solPercentages.map((_, index) => (
                    <div key={index}>
                      <div>
                        <p>Button {index + 1} (%)</p>
                        <input
                          id={`snipeWallet${index + 1}Percent`}
                          placeholder="%"
                          type="number"
                          step="0.0001"
                          className="float-input w-full rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                          value={solPercentages[index]}
                          onChange={(e) =>
                            handleSolPercentageChange(e.target.value, index)
                          }
                        />
                      </div>
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
