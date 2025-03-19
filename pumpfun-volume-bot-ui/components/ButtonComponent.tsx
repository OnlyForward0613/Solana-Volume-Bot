"use client";
import { Button } from "@heroui/button";
import React from "react";

interface ButtonProps {
  content: string;
  onClick: () => void;
}

export default function ButtonComponent(props: ButtonProps) {
  return (
    <Button
      color="default"
      variant="bordered"
      radius="sm"
      className="w-full bg-gradient-button text-white font-arial border-1 border-[#334155]"
      onPress={props.onClick}
    >
      {props.content}
    </Button>
  );
}
