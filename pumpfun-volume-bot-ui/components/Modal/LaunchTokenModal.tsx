"use client";
import React from "react";
import { useDispatch } from "react-redux";
import { Button } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { AppDispatch } from "@/redux/store";
import { launchToken } from "@/redux/thunks/tokenThunks";

interface LaunchTokanModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function LaunchTokanModal({
  isOpen,
  onOpenChange,
  authKey,
}: LaunchTokanModalProps) {
  const dispatch: AppDispatch = useDispatch();

  const handleGenerate = () => {
    dispatch(launchToken({ authKey }));
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
                Launch Token
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
                    color="success"
                    className="w-full text-white border-1 border-[#334155]"
                    onPress={handleGenerate}
                  >
                    Launch
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
