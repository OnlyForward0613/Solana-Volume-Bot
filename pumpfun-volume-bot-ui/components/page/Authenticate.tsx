"use client";
import React, { useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/redux/thunks/settingThunks";
import { toast } from "react-toastify";
import { Spinner } from "@heroui/spinner";

export default function Authenticate() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));

    const keyValue = data.key;
    if (typeof keyValue === "string") {
      try {
        setLoading(true);
        const res = await axios.post(`${API_URL}/auth/key`, {
          authKey: keyValue,
        });
        if (res.status === 200) {
          sessionStorage.setItem("key", keyValue);
          router.push("/dashboard");
          toast.success("Authentication successful");
        } else {
          throw new Error("Authentication failed");
        }
      } catch (error) {
        console.error(error);
        toast.error("Authentication failed");
      } finally {
        setLoading(false);
      }
    } else {
      console.error("The key value is not a string");
    }
  };
  return (
    <div className="fixed w-full h-screen border-none flex flex-col gap-5 items-center justify-center backdrop-blur-lg z-100 p-5">
      <Form
        className="w-full max-w-md flex flex-row items-center"
        validationBehavior="native"
        onSubmit={onSubmit}
      >
        <Input
          isRequired
          label="Authentication Key"
          labelPlacement="outside"
          name="key"
          placeholder="Please enter your authentication key"
          type="text"
          validate={(value) => {
            if (value.length !== 32) {
              return "Auth key must be 32 characters long";
            }
          }}
          classNames={{
            label:
              "text-white group-data-[filled-within=true]:text-white font-segoe text-xl pb-3",
            inputWrapper:
              "!bg-transparent data-[hover=true]:bg-transparent group-data-[focus=true]:!bg-transparent data-[hover=true]:!bg-transparent border-2 border-[#334155] h-14",
            input:
              "!text-white group-data-[has-value=true]:!text-white placeholder:text-slate-400 font-monospace",
          }}
          className="bg-transparent text-white"
          size="lg"
          disabled={loading}
          endContent={
            <Button
              color="success"
              variant="ghost"
              type="submit"
              size="md"
              className="py-2 my-2 text-success font-segoe"
            >
              {loading ? <Spinner color="white" /> : "Submit"}
            </Button>
          }
        />
      </Form>
    </div>
  );
}
