import React, { useState } from "react";
import { Button } from "@heroui/button";

const CopyButton = ({
  text,
  props,
  type,
}: {
  text: string;
  props?: string;
  type?: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <Button
      onPress={handleCopy}
      variant={
        type
          ? (type as
              | "flat"
              | "solid"
              | "bordered"
              | "light"
              | "faded"
              | "shadow"
              | "ghost"
              | undefined)
          : "flat"
      }
      color={isCopied ? "success" : "primary"}
      radius="sm"
      className={`w-full border-[#4e74a8] border-1 ${props} ${isCopied && "text-white"}`}
    >
      {isCopied ? "Copied!" : "Copy"}
    </Button>
  );
};

export default CopyButton;
