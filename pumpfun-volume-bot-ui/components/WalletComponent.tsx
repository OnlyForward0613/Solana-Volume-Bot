"use client";
import { Button } from "@heroui/button";
import React from "react";
import { WalletData } from "@/redux/slices/walletSlice";

export interface ClickEventProps {
  privateKey: string;
  value: number;
}

interface WalletComponentProps {
  index?: number;
  data: WalletData;
  onClick: ({ privateKey, value }: ClickEventProps) => void;
}

export default function WalletComponent(walletData: WalletComponentProps) {
  return (
    <div className="w-full flex items-center justify-between text-[12px] px-4 outline-1 outline outline-[#334155] rounded-lg h-[26px] font-monospace">
      <div className="flex gap-10">
        <p className="w-24">
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
        <p>{walletData?.data?.amount?.toFixed(4) + " SOL"}</p>
        <div className="gap-2 flex">
          {walletData?.data?.sellOptions &&
            walletData?.data?.sellOptions.map((item, index) => (
              <Button
                key={index}
                color="success"
                variant="ghost"
                size="sm"
                className="w-9 h-5 text-[11px] min-w-8 border-1 rounded-md bg-[rgb(96, 165, 250)]"
                onPress={() =>
                  walletData.onClick({
                    privateKey: walletData.data.privateKey,
                    value: item,
                  })
                }
              >
                {item}%
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
