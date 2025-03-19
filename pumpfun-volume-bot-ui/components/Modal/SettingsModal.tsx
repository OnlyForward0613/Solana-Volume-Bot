"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { SettingData } from "@/redux/slices/settingSlice";
import { AppDispatch, RootState } from "@/redux/store";
import { setNetworkSettings } from "@/redux/thunks/settingThunks";

interface WalletsModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

export default function SettingsModal({
  isOpen,
  onOpenChange,
  authKey,
}: WalletsModalProps) {
  const initSetting = useSelector((state: RootState) => state.setting);
  const [setting, setSetting] = useState<SettingData>({
    RPC_ENDPOINT: initSetting.data.RPC_ENDPOINT,
    RPC_WEBSOCKET_ENDPOINT: initSetting.data.RPC_WEBSOCKET_ENDPOINT,
    JITO_FEE: initSetting.data.JITO_FEE,
  });

  useEffect(() => {
    setSetting(initSetting.data);
  }, [initSetting]);

  const dispatch: AppDispatch = useDispatch();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Parse the input value as a float
    const floatValue = parseFloat(e.target.value);

    // Update the state with the float value
    setSetting({ ...setting, JITO_FEE: floatValue });
  };

  const handleSave = () => {
    if (!setting.RPC_ENDPOINT || !setting.RPC_WEBSOCKET_ENDPOINT) {
      toast.error("RPC URL and WebSocket URL cannot be empty.");
      return;
    }
    if (!setting.JITO_FEE) {
      toast.error("Please enter a valid Jito fee.");
      return;
    }
    dispatch(setNetworkSettings({...setting, authKey}));
    onOpenChange();
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
                <h3>Settings</h3>
                <div className="gap-5 flex">
                  <Button
                    className="bg-gradient-button text-white border-1 border-[#334155]"
                    onPress={handleSave}
                  >
                    Save
                  </Button>
                  <Button
                    className="bg-gradient-button text-white border-1 border-[#334155]"
                    onPress={() => onOpenChange()}
                  >
                    Close
                  </Button>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="w-full flex flex-col px-4 py-4 outline-1 outline outline-[#334155] rounded-lg font-segoe">
                  <h5 className="mb-2 text-lg">Network Configuration</h5>
                  <label className="text-[#FFFFFFCC] text-sm" htmlFor="rpcUrl">
                    RPC URL
                  </label>
                  <input
                    id="rpcUrl"
                    placeholder="Enter RPC URL"
                    type="text"
                    className="rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                    value={setting.RPC_ENDPOINT}
                    onChange={(e) =>
                      setSetting({ ...setting, RPC_ENDPOINT: e.target.value })
                    }
                  />
                  <label
                    className="text-[#FFFFFFCC] text-sm"
                    htmlFor="webSocketURL"
                  >
                    WebSocket URL
                  </label>
                  <input
                    id="webSocketURL"
                    placeholder="Enter Web Socket URL"
                    type="text"
                    className="rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 border-[#334155]"
                    value={setting.RPC_WEBSOCKET_ENDPOINT}
                    onChange={(e) =>
                      setSetting({
                        ...setting,
                        RPC_WEBSOCKET_ENDPOINT: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="w-full flex flex-col px-4 py-4 outline-1 outline outline-[#334155] rounded-lg font-segoe">
                  <h5 className="mb-2 text-lg">Transaction Settings</h5>
                  <label className="text-[#FFFFFFCC] text-sm" htmlFor="jitoTip">
                    Jito Tip (SOL)
                  </label>
                  <input
                    id="jitoTip"
                    placeholder="Enter Jito Tip address"
                    type="number"
                    step="0.0001" // Allows for decimal values
                    className="rounded-md bg-[#2e2d2d] bg-opacity-50 py-1 mb-2 px-3 outline-none float-input border-1 border-[#334155]"
                    value={setting.JITO_FEE}
                    onChange={handleChange}
                  />
                  <p>Optional tip for Jito MEV transactions</p>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
