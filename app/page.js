"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return null; // 不显示任何 UI
}
