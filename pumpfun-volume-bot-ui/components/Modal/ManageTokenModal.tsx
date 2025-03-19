"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";

import {
  generateWalletMint,
  setTokenMetaData,
} from "@/redux/thunks/tokenThunks";
import ImageUpload from "@/components/ImageUpload/ImageUpload";
import { AppDispatch, RootState } from "@/redux/store";
import { TelegramIcon, TwitterIcon, WebsiteIcon } from "../icons";
import { updateToken } from "@/redux/slices/tokenSlice";

interface ManageTokenModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  authKey: string;
}

const initTokenData = {
  name: "",
  symbol: "",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  // contractAddress: "",
};

export default function ManageTokenModal({
  isOpen,
  onOpenChange,
  authKey,
}: ManageTokenModalProps) {
  const dispatch: AppDispatch = useDispatch();
  const initContractAddress = useSelector(
    (state: RootState) => state.token.contractAddress
  );
  const tokenState = useSelector((state: RootState) => state.token.data);

  const [tokenData, setTokenData] = useState<{
    name: string;
    symbol: string;
    description: string;
    website: string;
    twitter: string;
    telegram: string;
  }>(initTokenData);
  const [contractAddress, setContractAddress] =
    useState<string>(initContractAddress);

  useEffect(() => {
    setContractAddress(initContractAddress);
  }, [initContractAddress]);

  const handleSave = async () => {
    try {
      if (!contractAddress) return toast.error("No contract address set");
      if (
        !tokenData.name ||
        !tokenData.symbol ||
        !tokenData.description ||
        !tokenState.image
      )
        return toast.error("There is no sufficient data to create token");

      // Define token metadata
      const jsonData = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description,
        image: tokenState.image, // Image file
        showName: true,
        createdOn: "https://pump.fun",
        twitter: tokenData.twitter,
        telegram: tokenData.telegram,
        website: tokenData.website,
      }

      try {
        // Create IPFS metadata storage

        const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: "POST", 
          headers: {
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`, 
            'Content-Type': 'application/json'
          }, 
          body: JSON.stringify({
            pinataOptions: {
              cidVersion: 1, 
            }, 
            pinataMetadata: {
              name: "metadata.json"
            },
            pinataContent: jsonData
          })
        })

        const resData = await res.json();

        try {
          if (
            resData.IpfsHash &&
            contractAddress &&
            tokenData.name &&
            tokenData.symbol
          ) {
            dispatch(
              setTokenMetaData({
                name: tokenData.name,
                symbol: tokenData.symbol,
                metadataUri: `https://gateway.pinata.cloud/ipfs/${resData.IpfsHash}`,
                mintPrivateKey: contractAddress,
                authKey,
              })
            );
            dispatch(
              updateToken({
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: tokenData.description,
                website: tokenData.website,
                twitter: tokenData.twitter,
                telegram: tokenData.telegram,
              })
            );
          } else toast.error("Invalid token data");
        } catch (e) {
          throw new Error(`Invalid JSON response: ${res}`);
        }
      } catch (error) {
        console.error("Error in createTokenMetadata:", error);
        throw error;
      }
    } catch (err) {
      toast.error("Failed to save token: " + err);
    } finally {
      onOpenChange();
    }
  };

  const handleClose = () => {
    setTokenData(initTokenData);
    onOpenChange();
  };

  const generateContract = async () => {
    dispatch(generateWalletMint({ authKey }));
  };

  return (
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
              <h3>Token Details</h3>
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
              <div className="w-full flex md:flex-row flex-col  md:justify-between justify-center items-center gap-10">
                <div className="w-[250px] h-[250px]">
                  <ImageUpload />
                </div>
                <div className="w-[500px] font-segoe">
                  <div className="w-full flex justify-between gap-3 mb-5">
                    <div className="w-2/3">
                      <label
                        htmlFor="tokenName"
                        className="text-[#FFFFFFCC] mb-2 text-sm block"
                      >
                        Token Name
                      </label>
                      <input
                        id="tokenName"
                        type="text"
                        placeholder="Enter token name"
                        className="rounded-md text-md bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                        value={tokenData.name}
                        onChange={(e) =>
                          setTokenData({ ...tokenData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tokenSymbol"
                        className="text-[#FFFFFFCC] mb-2 text-sm block"
                      >
                        Symbol
                      </label>
                      <input
                        id="tokenSymbol"
                        type="text"
                        placeholder="$SYMBOL"
                        className="rounded-md text-md bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                        value={tokenData.symbol}
                        onChange={(e) =>
                          setTokenData({ ...tokenData, symbol: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="tokenDescription"
                      className="text-[#FFFFFFCC] mb-2 text-sm block"
                    >
                      Description
                    </label>
                    <textarea
                      id="tokenDescription"
                      rows={4}
                      className="rounded-md w-full text-md bg-[#2e2d2d] bg-opacity-50 py-1 px-3 outline-none border-1 mb-2 border-[#334155]"
                      value={tokenData.description}
                      onChange={(e) =>
                        setTokenData({
                          ...tokenData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="w-full flex justify-between items-center gap-3 p-4 bg-[#FFFFFF05] rounded-lg">
                    <div className="relative">
                      <WebsiteIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-white" />
                      <input
                        type="text"
                        placeholder="Website"
                        className="rounded-md w-full text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 pl-8 outline-none border-1 border-[#334155]"
                        value={tokenData.website}
                        onChange={(e) =>
                          setTokenData({
                            ...tokenData,
                            website: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="relative">
                      <TwitterIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-white" />
                      <input
                        type="text"
                        placeholder="Twitter"
                        className="rounded-md w-full text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 pl-8 outline-none border-1 border-[#334155]"
                        value={tokenData.twitter}
                        onChange={(e) =>
                          setTokenData({
                            ...tokenData,
                            twitter: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="relative">
                      <TelegramIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-white" />
                      <input
                        type="text"
                        placeholder="Telegram"
                        className="rounded-md w-full text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 pl-8 outline-none border-1 border-[#334155]"
                        value={tokenData.telegram}
                        onChange={(e) =>
                          setTokenData({
                            ...tokenData,
                            telegram: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label
                      htmlFor="tokenContract"
                      className="text-[#FFFFFFCC] text-sm block"
                    >
                      Contract Address
                    </label>
                    <div className="flex justify-between items-center">
                      <input
                        id="tokenContract"
                        type="text"
                        placeholder="Contract will be generated"
                        className="rounded-md text-md bg-[#2e2d2d] bg-opacity-50 w-2/3 py-1 px-3 outline-none border-1 border-[#334155]"
                        value={contractAddress}
                        onChange={(e) => setContractAddress(e.target.value)}
                      />
                      <Button
                        color="primary"
                        variant="ghost"
                        onPress={generateContract}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
