"use client";
import { useEffect, useState } from "react";
import Tier1 from "./tier1";
import Tier2 from "./tier2";

export default function Dashboard() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(localStorage.getItem("role")); // 从登录存的 localStorage 取 role
  }, []);

  if (!role) return <div className="p-10 text-white">您没有权限查看此页面</div>;

  return role === "tier1" ? <Tier1 /> : <Tier2 />;
}
