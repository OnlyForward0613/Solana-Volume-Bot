"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import ButtonComponent from "../ButtonComponent";
import GenerateWalletsModal from "../Modal/GenerateWalletsModal";
import { useDisclosure } from "@heroui/modal";
import { AppDispatch, RootState } from "@/redux/store";
import { getWallets } from "@/redux/thunks/walletThunks";
import csvDownload from "@/utils/CSVDownload";
import ImportWalletsModal from "../Modal/ImportWalletsModal";
import DistributeSolModal from "../Modal/DistributeSolModal";
import GenerateDevWalletModal from "../Modal/GenerateDevWalletModal";
import GenerateSnipeWalletModal from "../Modal/GenerateSnipeWalletModal";
import RefundSolToFundWalletModal from "../Modal/RefundSolToFundWallet";
import useAuthenticate from "@/hooks/useAuthenticate";
import RefundWSolToFundWalletModal from "../Modal/RefundWSolToFundWallet";

export default function WalletSettingBar() {
  const router = useRouter();
  const key = useAuthenticate();

  useEffect(() => {
    if (key === undefined) {
      router.push("/");
    }
  }, [key, router]);

  const dispatch: AppDispatch = useDispatch();
  const walletData = useSelector((state: RootState) => state.wallet);

  // Refetch wallet state value
  const refetchWallet = useSelector((state: RootState) => state.wallet.refetch);
  useEffect(() => {
    if (refetchWallet && key) dispatch(getWallets({ authKey: key }));
  }, [refetchWallet, key]);

  const {
    isOpen: isImportWalletModalOpen,
    onOpen: onImportWalletModalOpen,
    onOpenChange: onImportWalletModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isDistributeSolModalOpen,
    onOpen: onDistributeSolModalOpen,
    onOpenChange: onDistributeSolModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isGenerateDevWalletModalOpen,
    onOpen: onGenerateDevWalletModalOpen,
    onOpenChange: onGenerateDevWalletModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isGenerateSnipeWalletModalOpen,
    onOpen: onGenerateSnipeWalletModalOpen,
    onOpenChange: onGenerateSnipeWalletModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isRefundSolToFundWalletModalOpen,
    onOpen: onRefundSolToFundWalletModalOpen,
    onOpenChange: onRefundSolToFundWalletModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isRefundWSolToFundWalletModalOpen,
    onOpen: onRefundWSolToFundWalletModalOpen,
    onOpenChange: onRefundWSolToFundWalletModalOpenChange,
  } = useDisclosure();

  const {
    isOpen: isGenerateWalletModalOpen,
    onOpen: onGenerateWalletModalOpen,
    onOpenChange: onGenerateWalletModalOpenCHange,
  } = useDisclosure();

  const handleGenerateWallets = () => {
    onGenerateWalletModalOpen();
  };

  const handleGenerateDevWallet = () => {
    onGenerateDevWalletModalOpen();
  };

  const handleGenerateSnipeWallet = () => {
    onGenerateSnipeWalletModalOpen();
  };

  const handleImportWallets = () => {
    onImportWalletModalOpen();
  };

  const handleExportWallets = () => {
    let csvData = [];
    csvData.push({
      name: walletData.data.fundWallet.name,
      amount: walletData.data.fundWallet.amount,
      privateKey: walletData.data.fundWallet.privateKey,
      address: walletData.data.fundWallet.address,
    });
    csvData.push({
      name: walletData.data.devWallet.name,
      amount: walletData.data.devWallet.amount,
      privateKey: walletData.data.devWallet.privateKey,
      address: walletData.data.devWallet.address,
    });

    csvData.push({
      name: walletData.data.snipeWallet.name,
      amount: walletData.data.snipeWallet.amount,
      privateKey: walletData.data.snipeWallet.privateKey,
      address: walletData.data.snipeWallet.address,
    });

    walletData.data.wallets.map((walletData, index) => {
      csvData.push({
        name: `${walletData.name} ${index + 1}`,
        amount: walletData.amount,
        privateKey: walletData.privateKey,
        address: walletData.address,
      });
    });

    csvDownload(csvData);
  };

  const handleDistributeSolToWallets = () => {
    onDistributeSolModalOpen();
  };

  const handleRefundSolToFundWallet = () => {
    onRefundSolToFundWalletModalOpen();
  };

  const handleRefundWSolToFundWallet = () => {
    onRefundWSolToFundWalletModalOpen();
  }

  if (!key) return null;

  return (
    <aside className="w-[250px] min-w-[200px] h-full bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline-[#334155] outline rounded-lg p-6 gap-4 flex flex-col">
      <GenerateWalletsModal
        isOpen={isGenerateWalletModalOpen}
        onOpenChange={onGenerateWalletModalOpenCHange}
        authKey={key}
      />
      <ImportWalletsModal
        isOpen={isImportWalletModalOpen}
        onOpenChange={onImportWalletModalOpenChange}
        authKey={key}
      />
      <DistributeSolModal
        isOpen={isDistributeSolModalOpen}
        onOpenChange={onDistributeSolModalOpenChange}
        authKey={key}
      />
      <GenerateDevWalletModal
        isOpen={isGenerateDevWalletModalOpen}
        onOpenChange={onGenerateDevWalletModalOpenChange}
        authKey={key}
      />
      <GenerateSnipeWalletModal
        isOpen={isGenerateSnipeWalletModalOpen}
        onOpenChange={onGenerateSnipeWalletModalOpenChange}
        authKey={key}
      />
      <RefundSolToFundWalletModal
        isOpen={isRefundSolToFundWalletModalOpen}
        onOpenChange={onRefundSolToFundWalletModalOpenChange}
        authKey={key}
      />
      <RefundWSolToFundWalletModal
        isOpen={isRefundWSolToFundWalletModalOpen}
        onOpenChange={onRefundWSolToFundWalletModalOpenChange}
        authKey={key}
      />
      <ButtonComponent
        content="Generate Wallets"
        onClick={handleGenerateWallets}
      />
      <ButtonComponent
        content="Generate Dev Wallet"
        onClick={handleGenerateDevWallet}
      />
      <ButtonComponent
        content="Generate Snipe Wallet"
        onClick={handleGenerateSnipeWallet}
      />
      <ButtonComponent content="Import Wallets" onClick={handleImportWallets} />
      <ButtonComponent content="Export Wallets" onClick={handleExportWallets} />
      <ButtonComponent
        content="Distribute SOL to Wallets"
        onClick={handleDistributeSolToWallets}
      />
      <ButtonComponent
        content="Refund SOL to Fund Wallet"
        onClick={handleRefundSolToFundWallet}
      />
      <ButtonComponent
        content="Refund WSOL to Fund Wallet"
        onClick={handleRefundWSolToFundWallet}
      />
    </aside>
  );
}
