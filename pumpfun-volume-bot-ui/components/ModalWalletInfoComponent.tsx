import { WalletData } from "@/redux/slices/walletSlice";
import { Button } from "@heroui/button";
import React, { useState } from "react";
import CopyButton from "./CopyTextButton";

interface ModalWalletInfoComponentProps {
  data: WalletData;
  index?: number;
  onClickRemove: (privateKey?: string | undefined) => void;
}

export default function ModalWalletInfoComponent(
  walletData: ModalWalletInfoComponentProps
) {
  const [isVisible, setVisible] = useState(false);
  return (
    <>
      <div className="w-full flex items-center justify-between text-[12px] px-4 py-4 outline-1 outline outline-[#334155] rounded-lg font-monospace">
        <div className="flex gap-10">
          <p>
            {walletData.data.name}{" "}
            {walletData.index !== undefined ? walletData.index + 1 : null}
          </p>
          <p>
            {walletData.data.address?.slice(0, 5) +
              "..." +
              walletData.data.address?.slice(-5)}
          </p>
        </div>

        <div className="flex gap-5 items-center">
          <p>{walletData.data.amount.toFixed(4) + " SOL"}</p>
          <Button
            variant="bordered"
            color="default"
            radius="sm"
            className="text-white text-[12px] h-8 w-28 border-1"
            onPress={(e) => setVisible((pre) => !pre)}
          >
            Show Details
          </Button>
          <Button
            variant="ghost"
            color="danger"
            radius="sm"
            className="text-[14px] h-8 w-24 border-1"
            onPress={(e) => walletData.onClickRemove(walletData?.data.privateKey)}
          >
            Remove
          </Button>
        </div>
      </div>
      {isVisible && (
        <div className="m-4 text-[12px] px-4 py-2 outline-1 outline outline-[#334155] rounded-lg font-monospace">
          FULL ADDRESS:
          <div className="text-[12px] px-4 py-4 outline-1 outline outline-[#334155] rounded-lg mb-4 mt-1">
            <p className="mb-2">{walletData.data.address}</p>
            <CopyButton text={walletData.data.address} />
          </div>
          PRIVATE KEY:
          <div className="text-[12px] px-4 py-4 outline-1 outline outline-[#334155] rounded-lg mt-1">
            <p className="mb-2">{walletData.data.privateKey}</p>
            <CopyButton text={walletData.data.privateKey} />
          </div>
        </div>
      )}
    </>
  );
}
