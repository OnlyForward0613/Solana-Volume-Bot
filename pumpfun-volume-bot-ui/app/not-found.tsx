"use client"
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirects the user to the home page after mounting.
    router.push("/");
  }, [router]);
  return null;
}
