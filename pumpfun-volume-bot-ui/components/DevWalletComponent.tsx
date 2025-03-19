"use client";
import { Button } from "@heroui/button";
import React from "react";
import { WalletData } from "@/redux/slices/walletSlice";
import { ClickEventProps } from "./WalletComponent";

interface DevWalletComponentProps {
  data: WalletData;
  onClick: ({ privateKey, value }: ClickEventProps) => void;
}

export default function DevWalletComponent(props: DevWalletComponentProps) {
  return (
    <div className="w-[580px] fixed bottom-0 bg-[#080A0e] left-1/2 -translate-x-1/2 flex items-center justify-between text-[12px] px-4 outline-1 outline outline-[#334155] rounded-lg font-monospace py-3">
      <div className="flex gap-10">
        <p>{props.data.name}</p>
        <p>
          {props.data.address?.slice(0, 5) +
            "..." +
            props.data.address?.slice(-5)}
        </p>
      </div>

      <div className="flex gap-5 items-center">
        <p>{props.data.amount.toFixed(4) + " SOL"}</p>
        <div className="gap-2 flex">
          {props.data.sellOptions?.map((item, index) => (
            <Button
              key={index}
              color="success"
              variant="ghost"
              size="sm"
              onPress={() => props.onClick({ privateKey: props.data.privateKey, value: item })}
              className="w-9 h-5 text-[11px] my-1 min-w-8 border-1 rounded-md bg-[rgb(96, 165, 250)]"
            >
              {item}%
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
