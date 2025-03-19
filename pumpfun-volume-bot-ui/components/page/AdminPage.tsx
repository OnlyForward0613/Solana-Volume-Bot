"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import useAuthenticate from "@/hooks/useAuthenticate";
import { Divider } from "@heroui/divider";
import { Card, CardBody, CardHeader } from "@heroui/card";
import UserComponent, { UserData } from "../UserComponent";
import CopyButton from "../CopyTextButton";
import { Button } from "@heroui/button";
import generateUniqueKey, { authHeader } from "@/utils/authKey";
import { AdminNavbar } from "../adminNavBar";
import axios from "axios";
import { API_URL } from "@/redux/thunks/settingThunks";
import Loading from "../Loading/Loading";

export default function AdminPage() {
  const router = useRouter();
  const key = useAuthenticate();

  useEffect(() => {
    if (key === undefined) {
      router.push("/");
    }
  }, [key, router]);

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [newMember, setNewMember] = useState<UserData>({
    name: "",
    authKey: "",
  });

  const [isEditable, setIsEditable] = useState<boolean>(false);

  const [userList, setUserList] = useState<UserData[]>([]);

  const getAllUsers = async () => {
    if (!key) return;
    try {
      const res = await axios.get(
        `${API_URL}/admin/get-all-users`,
        authHeader(key)
      );
      setUserList(res.data);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const handleUpdateNewKey = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    // TODO: Implement key update logic
    setNewMember({ ...newMember, authKey: e.target.value });
  };

  const handleUpdateNewName = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    // TODO: Implement name update logic
    setNewMember({ ...newMember, name: e.target.value });
  };

  const generateNewKey = () => {
    // TODO: Implement key generation logic
    if (isEditable) return;
    const newKey = generateUniqueKey();
    setNewMember({ ...newMember, authKey: newKey });
  };

  const handleCreate = async () => {
    // TODO: Implement user creation logic
    if (newMember.authKey === undefined || newMember.authKey === "") {
      toast.error("Please generate a key first");
      return;
    }
    if (newMember.name === "") {
      toast.error("Please enter a name");
      return;
    }
    if (userList.some((user) => user.authKey === newMember.authKey)) {
      toast.error("Key already exists");
      return;
    }
    if (!key) return;
    const response = await axios.post(
      `${API_URL}/admin/set-user`,
      newMember,
      authHeader(key)
    );
    if (response.status === 200) {
      setNewMember({ name: "", authKey: "" });
      getAllUsers();
      toast.success(`User has been created successfully`);
    } else {
      toast.error("Failed to create user");
    }
  };

  const handleClear = () => {
    setNewMember({ name: "", authKey: "" });
  };

  const handleDelete = async (userData: UserData) => {
    if (!key) return;
    try {
      const response = await axios.post(
        `${API_URL}/admin/delete-user`,
        {
          authKey: userData.authKey,
        },
        authHeader(key)
      );
      if (response.status === 200) {
        getAllUsers();
        toast.success(response.data);
      } else {
        toast.error("Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const allowEditable = (userData: UserData) => {
    // TODO: Implement user edit logic
    setNewMember(userData);
    setIsEditable(true);
  };

  const handleEdit = async () => {
    if (newMember.name === undefined || newMember.name === "") {
      toast.error("Please enter a name");
      return;
    }

    if (!key) return;

    try {
      const res = await axios.post(
        `${API_URL}/admin/edit-user`,
        {
          newUsername: newMember.name,
          authKey: newMember.authKey,
        },
        authHeader(key)
      );
      if (res.status === 200) {
        setNewMember({ name: "", authKey: "" });
        getAllUsers();
        toast.success(`User name has been updated successfully`);
      } else {
        toast.error("Failed to update user");
        // Reset newMember to prevent the user from seeing the old name
        setNewMember({ name: "", authKey: "" });
      }
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsEditable(false);
    }
  };

  const handleCancel = () => {
    // TODO: Implement user edit cancel logic
    setIsEditable(false);
    setNewMember({ name: "", authKey: "" });
  };

  useEffect(() => {
    if (key) getAllUsers();
  }, [key]);

  useEffect(() => {
    const adminCheck = async () => {
      if (!key) return;
      try {
        const res = await axios.post(
          `${API_URL}/auth/admin`,
          { authKey: key },
          authHeader(key)
        );
        if (res.status === 200) {
          setIsAdmin(res.data);
        } else {
          setIsAdmin(false);
          router.push("/dashboard");
        }
      } catch (error) {
        toast.error("You are not allowed to access this page");
        router.push("/dashboard");
      }
    };
    adminCheck();
  }, [key]);

  if (!key) {
    return <Loading />;
  }

  if (!isAdmin) {
    return <Loading />;
  }

  return (
    <>
      <AdminNavbar />
      <main className="flex h-full gap-10 p-10 flex-grow">
        <aside className="w-1/3 min-w-[300px] h-full bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline-[#334155] outline rounded-lg p-6 flex flex-col justify-between">
          <Card className="flex bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline outline-[#334155] rounded-lg text-white overflow-y-auto h-auto">
            <CardHeader className="h-10 my-2 text-xl text-center justify-between px-6 py-6 font-segoe">
              {isEditable ? "Edit User" : "Create User"}
              <div className="gap-5 flex">
                <Button
                  className="bg-gradient-button text-white border-1 border-[#334155]"
                  onPress={isEditable ? handleEdit : handleCreate}
                >
                  {isEditable ? "Edit" : "Create"}
                </Button>
                <Button
                  className="bg-gradient-button text-white border-1 border-[#334155]"
                  onPress={isEditable ? handleCancel : handleClear}
                >
                  {isEditable ? "Cancel" : "Clear"}
                </Button>
              </div>
            </CardHeader>
            <Divider className="bg-[#334155]" />
            <CardBody className="h-48 justify-center w-full p-6">
              <div className="flex flex-col w-full justify-between gap-5">
                <div>
                  <label
                    htmlFor="username"
                    className="text-[#FFFFFFCC] text-md block"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    className="rounded-md text-md bg-[#2e2d2d] bg-opacity-50 w-2/3 py-1 px-3 outline-none border-1 border-[#334155]"
                    value={newMember.name}
                    onChange={handleUpdateNewName}
                  />
                </div>
                <div className="w-full">
                  <label
                    htmlFor="authNewKey"
                    className="text-[#FFFFFFCC] text-md block"
                  >
                    Authentication Key
                  </label>
                  <div className="flex justify-between">
                    <input
                      id="authNewKey"
                      type="text"
                      placeholder="Auth key will be generated"
                      className="rounded-md text-md bg-[#2e2d2d] bg-opacity-50 w-2/3 py-1 px-3 outline-none border-1 border-[#334155]"
                      disabled={isEditable}
                      value={newMember.authKey}
                      onChange={handleUpdateNewKey}
                    />
                    <Button
                      color="primary"
                      variant="ghost"
                      onPress={generateNewKey}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card className="flex bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline outline-[#334155] rounded-lg text-white overflow-y-auto">
            <CardHeader className="text-xl text-center justify-center px-6 py-6 font-segoe">
              Admin Info
            </CardHeader>
            <Divider className="bg-[#334155]" />
            <CardBody className="h-24 justify-center">
              <div className="w-full flex items-center justify-between text-md px-4 rounded-lg h-10  font-monospace">
                <p>Admin</p>
                <p>{key.slice(0, 5) + "..." + key.slice(-5)}</p>
                <CopyButton text={key} props="w-10 h-8" type="ghost" />
              </div>
            </CardBody>
          </Card>
        </aside>
        <Card className="flex-grow min-w-[600px] bg-black bg-opacity-[.05] backdrop-blur-xl shadow-md outline-1 outline outline-[#334155] rounded-lg text-white overflow-y-auto">
          <CardHeader className="h-1 text-xl text-center justify-center px-6 py-6 font-segoe">
            User List
          </CardHeader>
          <Divider className="bg-[#334155]" />
          <CardBody className="gap-1.5">
            {userList.map((user) => (
              <UserComponent
                key={user.authKey}
                userData={user}
                onEdit={allowEditable}
                onDelete={handleDelete}
              />
            ))}
          </CardBody>
        </Card>
      </main>
    </>
  );
}
