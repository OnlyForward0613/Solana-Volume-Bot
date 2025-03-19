import React from "react";
import { CloseIcon } from "./icons";

interface WalletInputComponentProps {
  wallet: string;
  index: number;
  onChange: (wallet: string, id: number) => void;
  onRemove: (index: number) => void;
}

export default function WalletInputComponent(data: WalletInputComponentProps) {
  return (
    <div className="flex flex-col gap-2 font-monospace">
      <div className="flex justify-between items-center relative">
        <p className="mt-3">Wallet {data.index + 1}</p>
        <button
          type="button"
          className="absolute appearance-none select-none top-1 end-1 p-1 text-xl text-background hover:text-danger rounded-full hover:bg-default-100 active:bg-default-200 tap-highlight-transparent outline-none data-[focus-visible=true]:z-10 cursor-pointer"
          onClick={() => data.onRemove(data.index)}
        >
          <CloseIcon />
        </button>
      </div>

      <input
        placeholder={`Enter wallet ${data.index + 1} private key`}
        type="text"
        className="rounded-md bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 border-[#334155]"
        value={data.wallet}
        onChange={(e) => data.onChange(e.target.value, data.index)}
      />
    </div>
  );
}
