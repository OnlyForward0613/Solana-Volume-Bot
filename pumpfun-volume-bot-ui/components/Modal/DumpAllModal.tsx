"use client";
import React from "react";
import { useDispatch } from "react-redux";
import { Button } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { sellDumpAll } from "@/redux/thunks/walletThunks";
import { AppDispatch } from "@/redux/store";

interface DumpAllModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function DumpAllModal({
  isOpen,
  onOpenChange,
  authKey,
}: DumpAllModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const handleGenerate = () => {
    dispatch(sellDumpAll({ authKey }));
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
                Dump all
              </ModalHeader>
              <ModalBody>
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
                    Dump
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
