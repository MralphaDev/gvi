"use client";
import { useEffect, useState } from "react";

export default function Tier2Dashboard() {
  const [products, setProducts] = useState([]);
  const [inventoryLog, setInventoryLog] = useState([]);
  const [form, setForm] = useState({ product_id: "", action: "IN", quantity: 0 });

  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    }
    fetchProducts();

    async function fetchInventoryLog() {
      const res = await fetch("/api/inventory_log");
      const data = await res.json();
      setInventoryLog(data);
    }
    fetchInventoryLog();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.quantity) return;

    const res = await fetch("/api/inventory_log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const newEntry = await res.json();
      setInventoryLog([newEntry, ...inventoryLog]); // 更新前端列表
      setForm({ product_id: "", action: "IN", quantity: 0 }); // 清空表单
      alert("Log added successfully");
      window.location.reload();
    } else {
      alert("Failed to add log");
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  return (
    <div className="min-h-screen p-10 bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">Tier 2 Dashboard - Product Inventory & Inventory Log</h1>

      {/* Product Inventory */}
      <div className="bg-zinc-800 rounded-xl p-4 overflow-auto max-h-[70vh] mb-6">
        <h2 className="text-lg font-semibold mb-2">Product Inventory</h2>
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id} className="border-b border-zinc-700 pb-1">
              <strong>{p.name}</strong> — Category: {p.category}, Serial: {p.serial_number}, Type: {p.type}, Manufacturer: {p.manufacturer}, Inventory: {p.current_inventory}
            </li>
          ))}
        </ul>
      </div>

      {/* Add Inventory Log */}
      <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-xl p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Add Inventory Log</h2>
        <div className="flex gap-4">
          <select name="product_id" value={form.product_id} onChange={handleChange} className="p-2 bg-zinc-900 rounded">
            <option value="">Select Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="action" value={form.action} onChange={handleChange} className="p-2 bg-zinc-900 rounded">
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
          <input type="number" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" className="p-2 bg-zinc-900 rounded w-24" />
          <button type="submit" className="bg-green-600 px-4 rounded">Add</button>
        </div>
      </form>

    </div>
  );
}
