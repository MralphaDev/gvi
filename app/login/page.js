"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function Login() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      if (!res.ok) {
        alert("Invalid account or password");
        setLoading(false);
        return;
      }

      const { role } = await res.json();
      // 保存 role 到 localStorage
      localStorage.setItem("role", role);

      // 根据 role 跳转
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-96 p-10 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl"
        >
            {/* 顶部标题 */}
            <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">CURTIN AUTOMATION</h1>
            </div>

            {/* 登录卡片 */}
            <div className="bg-zinc-800 p-6 rounded-2xl shadow-inner">
            <h2 className="text-xl font-semibold text-center text-white mb-6">Sign In</h2>

            <input
                type="text"
                placeholder="Account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full p-3 mb-4 rounded-lg bg-zinc-700 text-white outline-none focus:ring-2 focus:ring-white"
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 mb-6 rounded-lg bg-zinc-700 text-white outline-none focus:ring-2 focus:ring-white"
            />

            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:opacity-80 transition"
            >
                {loading ? "Signing In..." : "Sign In"}
            </motion.button>
            </div>
        </motion.div>
    </div>

  );
}
