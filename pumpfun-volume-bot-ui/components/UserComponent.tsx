"use client";
import { Button } from "@heroui/button";
import React from "react";
import CopyButton from "./CopyTextButton";

export interface UserDataProps {
  userData: UserData;
  onEdit: (userData: UserData) => void;
  onDelete: (userData: UserData) => void;
}

export interface UserData {
  name: string;
  authKey: string;
}

export default function UserComponent(props: UserDataProps) {
  return (
    <div className="w-full flex items-center justify-between text-[12px] px-4 outline-1 outline outline-[#334155] rounded-lg h-10  font-monospace">
      <div className="flex gap-10 items-center">
        <p className="w-24">{props.userData.name}</p>
        <p>{props.userData.authKey}</p>
      </div>

      <div className="flex gap-5 items-center">
        <div className="gap-2 flex">
          <CopyButton type="ghost" text={props.userData.authKey} props="h-8 w-10" />
          <Button
            color="success"
            variant="ghost"
            size="sm"
            className="text-md min-w-8 border-1 rounded-md bg-[rgb(96, 165, 250)]"
            onPress={() => props.onEdit(props.userData)}
          >
            Edit
          </Button>
          <Button
            color="danger"
            variant="ghost"
            size="sm"
            className="text-md min-w-8 border-1 rounded-md bg-[rgb(96, 165, 250)]"
            onPress={() => props.onDelete(props.userData)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
