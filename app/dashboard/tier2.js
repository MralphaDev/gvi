"use client";
import React from "react";
import { useEffect, useState } from "react";



export default function Tier1() {
  const [products, setProducts] = useState([]);
  const [inventoryLog, setInventoryLog] = useState([]);
  const [coil, setCoil] = useState([]); // 新增 coil 状态
  const [coilForm, setCoilForm] = useState({
  id: null,
  name: "",
  voltage: "",
  inventory: "",
  manufacturer: ""
});

  const [productForm, setProductForm] = useState({ id: "", name: "", price:"", model_number: "", manufacturer:"", connection: "", inner_diameter: "", voltage:"", max_pressure:"", temperature_range:"", current_inventory: "" });
  const [startIndex, setStartIndex] = useState(0); // 当前显示的起始索引
  const [logForm, setLogForm] = useState({ id: "", product_id: "", action: "IN", quantity: "",company_sold_to: "" ,voltage:"" , coil_id: null, mode: "both"});
  const [searchProduct, setSearchProduct] = useState("");
  const [searchDate, setSearchDate] = useState("");


//const [page, setPage] = React.useState(1);
const [selectedCompany, setSelectedCompany] = React.useState(""); // 默认显示全部

const fields = [
  { name: "name", placeholder: "Name" },
  { name: "price", placeholder: "Price", type: "number" },
  { name: "model_number", placeholder: "Model Number" },
  { name: "connection", placeholder: "Connection" },
  { name: "inner_diameter", placeholder: "Inner Diameter" },
  { name: "voltage", placeholder: "Voltage" },
  { name: "max_pressure", placeholder: "Max Pressure" },
  { name: "temperature_range", placeholder: "Temperature Range" },
  { name: "current_inventory", placeholder: "Inventory", type: "number" },
];

  // fetch products & log
  useEffect(() => {
    fetchProducts();
    fetchInventoryLog();
    fetchCoil();
  }, []);


const fetchCoil = async () => {
  const res = await fetch(`/api/coil${searchProduct ? `?search=${searchProduct}` : ""}`);
  console.log("fetch coil response:", res);
  const data = await res.json();
  setCoil(data);
};

const handleCoilSubmit = async () => {
  try {
    const method = coilForm.id ? "PUT" : "POST"; // 有 id 就是更新，否则新增
    const url = "/api/coil";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coilForm),
    });

    if (!res.ok) throw new Error("Failed to submit coil");

    // 刷新列表
    fetchCoil();

    // 重置表单
    setCoilForm({
      id: null,
      name: "",
      voltage: "",
      inventory: 0,
      manufacturer: ""
    });

  } catch (err) {
    console.error(err);
    alert("Submit failed");
  }
};

const handleCoilDelete = async (id) => {
  if (!confirm("Delete this coil?")) return;

  try {
    const res = await fetch("/api/coil", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) throw new Error("Failed to delete coil");

    // 刷新列表
    setCoil(prev => prev.filter(c => c.id !== id));
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  }
};

const fetchProducts = async () => {
  const res = await fetch(`/api/products${searchProduct ? `?search=${searchProduct}` : ""}`);
  const data = await res.json();
  setProducts(data);
};

const fetchInventoryLog = async (date) => {
  const url = date ? `/api/inventory_log?date=${date}` : `/api/inventory_log`;
  const res = await fetch(url);
  const data = await res.json();
  setInventoryLog(data);
};

  const handleChange = (e, formType) => {
    const value = e.target.type === "number" ? +e.target.value : e.target.value;
    if (formType === "product") setProductForm({ ...productForm, [e.target.name]: value });
    if (formType === "log") setLogForm({ ...logForm, [e.target.name]: value });
    if (formType === "coil")setCoilForm({ ...coilForm, [e.target.name]: value });
};

const handleProductSubmit = async () => {
  const method = productForm.id ? "PUT" : "POST";
  const url = "/api/products"; // 统一接口
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productForm), // body 里带 id
  });
if (res.ok) {
  setProductForm({
    id: "",
    name: "",
    price: "",
    model_number: "",
    manufacturer: "",
    connection: "",
    inner_diameter: "",
    voltage: "",
    max_pressure: "",
    temperature_range: "",
    current_inventory: 0,
    category: "",
    type: "",
    form_factor: "",
    nominal_size: "",
    connection_type: "",
    construction: "",
    kv_value: "",
    switching_function: "",
    control: "",
    material: "",
    sealing: "",
    voltage_tolerance: "",
    power_consumption: "",
    duty_cycle: "",
    protection_class: "",
    medium: "",
    medium_temperature: "",
    ambient_temperature: "",
    installation_position: "",
    src: ""
  });
  fetchProducts();
}

};

const handleProductDelete = async (id) => {
  if (!confirm("Delete this product?")) return;
  await fetch(`/api/products`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  fetchProducts();
};


const handleLogSubmit = async () => {
  const productName = products.find(p => p.id === +logForm.product_id)?.name;
  const matchedCoil = coil.find(c =>
    c.name?.trim().toLowerCase() === productName?.trim().toLowerCase() &&
    c.voltage?.trim().toLowerCase() === logForm.voltage?.trim().toLowerCase()
  );

  const logToSubmit = { ...logForm, coil_id: matchedCoil ? matchedCoil.id : null };
  const method = logForm.id ? "PUT" : "POST";

  const res = await fetch("/api/inventory_log", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logToSubmit),
  });

  if (res.ok) {
    const quantityChange = logForm.action === "IN" ? logForm.quantity : -logForm.quantity;

    // 根据 mode 更新对应 state
    if (logForm.mode === "product" || logForm.mode === "both") {
      setProducts(prev =>
        prev.map(p =>
          p.id === +logForm.product_id
            ? { ...p, current_inventory: (p.current_inventory || 0) + quantityChange }
            : p
        )
      );
    }

    if ((logForm.mode === "coil" || logForm.mode === "both") && matchedCoil) {
      setCoil(prev =>
        prev.map(c =>
          c.id === matchedCoil.id
            ? { ...c, inventory: (c.inventory || 0) + quantityChange }
            : c
        )
      );
    }

    // 重置表单
    setLogForm({ id: "", product_id: "", action: "IN", quantity: 0, voltage: "", company_sold_to: "", coil_id: null, mode: "both" });

    // 更新日志
    fetchInventoryLog();
  }
};



const handleLogDelete = async (id) => {
  if (!id) return alert("Missing log id");
  if (!confirm("Delete this log?")) return;
  await fetch("/api/inventory_log", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  setLogForm({ id: "", product_id: "", action: "IN", quantity: 0, voltage: "", company_sold_to: "" });
  fetchInventoryLog();
  fetchProducts();
};

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")} ${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getFullYear()).slice(-2)}`;
  };

  return (
    <div className="min-h-screen p-10 bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">Curtin Automation Inventory management System</h1>
      <div className="grid grid-cols-2 gap-6 ">

        {/* Product Inventory */}
        <div className="bg-zinc-800 rounded-xl p-4 overflow-auto flex flex-col gap-4">
          <h2 className="text-lg font-semibold mb-2">Product Inventory</h2>

          {/* Company Filter Dropdown */}
          <div className="mb-2">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="p-2 rounded bg-zinc-900 text-white"
            >
              <option value="">All Companies</option>
              <option value="ceme">CEME</option>
              <option value="jaksa">JAKSA</option>
              <option value="saturn">SATURN</option>
              <option value="rotork">ROTORK</option>
              <option value="goetvalve">GOETVALVE</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search Product Name..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="p-2 rounded bg-zinc-900 text-white flex-1"
            />
            <button onClick={fetchProducts} className="bg-blue-600 px-4 py-2 rounded">Search</button>
            <button 
              onClick={() => { 
                setSearchProduct("");
                fetch(`/api/products`)
                  .then(res => res.json())
                  .then(data => setProducts(data));
              }} 
              className="bg-gray-600 px-4 py-2 rounded"
            >
              Deselect
            </button>
          </div>

          {/* Product List */}
          <div className="overflow-x-auto">
            <ul className="space-y-4 max-h-100 overflow-y-auto min-w-max">
              {products
                .filter(p => !selectedCompany || p.manufacturer === selectedCompany)
                .map((p) => (
                  <li key={p.id} className="border-b border-zinc-700 pb-1 flex gap-4 items-center min-w-max">
                    <img src={p.src} alt={p.name} className="w-20 h-20 object-cover rounded" />

                    <div className="flex gap-4 min-w-max">
                      <span className="w-36"><strong>{p.name}</strong></span>
                      <span className="w-20">Inventory: {p.current_inventory}</span>
                      <span className="w-24">Modell number:<br/>{p.model_number}</span>
                      <span className="w-20">Inner Dia: {p.inner_diameter ?? "-"}</span>
                      <span className="w-24">Temp: {p.temperature_range ?? "-"}</span>
                      <span className="w-20">Price: {p.price ?? "-"}<br/> Euro</span>
                      <span className="w-20">Voltage: {p.voltage ?? "-"}</span>
                      <span className="w-28">Max Pressure: {p.max_pressure ?? "-"}</span>
                      <span className="w-24">Connection: {p.connection ?? "-"}</span>
                    </div>

                    <div className="flex gap-2 ml-auto">
                      <button className="bg-yellow-600 px-2 rounded" onClick={() => setProductForm(p)}>Edit</button>
                      <button className="bg-red-600 px-2 rounded" onClick={() => handleProductDelete(p.id)}>Delete</button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>


          {/* Product Form */}
          <div className="flex flex-col gap-2 mt-2">
            {fields.slice(startIndex, startIndex + 4).map((field, i) => (
              <input
                key={i}
                name={field.name}
                type={field.type || "text"}
                value={productForm[field.name] ?? ""}
                onChange={(e) => {
                  const val = field.type === "number"
                    ? Math.max(0, Math.floor(+e.target.value || 0))
                    : e.target.value;
                  setProductForm({ ...productForm, [field.name]: val });
                }}
                placeholder={field.placeholder}
                className="p-2 rounded bg-zinc-900 text-white"
              />
              
            ))}
           {/* 只有在最后一页才显示 manufacturer 下拉框*/}
            {startIndex + 4 >= fields.length && (
            <select
              name="manufacturer"
              value={productForm.manufacturer || ""}
              onChange={(e) => setProductForm({ ...productForm, manufacturer: e.target.value })}
              className="p-2 rounded bg-zinc-900 text-white"
            >
              <option value="">Select Manufacturer</option>
              {Array.from(new Set(products.map(p => p.manufacturer))).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

          )}

            <div className="flex gap-2 mt-2">
              <button
                disabled={startIndex === 0}
                onClick={() => setStartIndex(startIndex - 4)}
                className="bg-gray-600 px-4 py-2 rounded"
              >
                Prev
              </button>
              <button
                disabled={startIndex + 4 >= fields.length}
                onClick={() => setStartIndex(startIndex + 4)}
                className="bg-gray-600 px-4 py-2 rounded"
              >
                Next
              </button>
              <button
                className={`ml-auto p-2 rounded ${productForm.id ? "bg-blue-600" : "bg-green-600"}`}
                onClick={handleProductSubmit}
              >
                {productForm.id ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Coil Inventory */}
        <div className="bg-zinc-800 rounded-xl p-4 overflow-auto flex flex-col gap-4">
          <h2 className="text-lg font-semibold mb-2">Coil Inventory</h2>

          {/* Manufacturer Filter Dropdown */}
          <div className="mb-2">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="p-2 rounded bg-zinc-900 text-white"
            >
              <option value="">All Manufacturers</option>
              <option value="ceme">CEME</option>
              <option value="jaksa">JAKSA</option>
              <option value="saturn">SATURN</option>
              <option value="rotork">ROTORK</option>
              <option value="goetvalve">GOETVALVE</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search Coil Name..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="p-2 rounded bg-zinc-900 text-white flex-1"
            />
            <button onClick={fetchCoil} className="bg-blue-600 px-4 py-2 rounded">Search</button>
            <button 
              onClick={() => { 
                setSearchProduct("");
                fetch(`/api/coil`)
                  .then(res => res.json())
                  .then(data => setCoil(data));
              }} 
              className="bg-gray-600 px-4 py-2 rounded"
            >
              Deselect
            </button>
          </div>

          {/* Coil List */}
          <ul className="space-y-2 overflow-auto max-h-100">
            {coil
              .filter(c => !selectedCompany || c.manufacturer === selectedCompany)
              .map((c) => (
                
                <li key={c.id} className="border-b border-zinc-700 pb-1 flex justify-between items-center">
                  <span><strong>{c.name}</strong> — Inventory: {c.inventory}</span>
                  {c.voltage && <span>Voltage: {c.voltage}</span>}
                  <span>Manufacturer: {c.manufacturer}</span>
                  <div className="flex gap-2">
                    <button className="bg-yellow-600 px-2 rounded" onClick={() => setCoilForm(c)}>Edit</button>
                    <button className="bg-red-600 px-2 rounded" onClick={() => handleCoilDelete(c.id)}>Delete</button>
                  </div>
                </li>
              ))
            }
          </ul>

          {/* Coil Form */}
          <div className="flex flex-col gap-2 mt-2">
            <select
              name="name"
              value={coilForm.name}
              onChange={(e) => handleChange(e, "coil")}
              className="p-2 rounded bg-zinc-900 text-white"
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
           <input name="voltage" value={coilForm.voltage} onChange={(e) => handleChange(e, "coil")} placeholder="Voltage" className="p-2 rounded bg-zinc-900 text-white"/>
           <input
            type="number"
            name="inventory"
            value={coilForm.inventory}
            onChange={(e) => {
              const val = Math.max(0, Math.floor(+e.target.value || ""));
              setCoilForm({ ...coilForm, inventory: val });
            }}
            placeholder="Inventory"
            className="p-2 rounded bg-zinc-900 text-white"
            min={0}
            step={1}
          />
            <select name="manufacturer" value={coilForm.manufacturer} onChange={(e) => handleChange(e, "coil")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="" disabled hidden>Select Manufacturer</option>
              <option value="ceme">CEME</option>
              <option value="jaksa">JAKSA</option>
              <option value="saturn">SATURN</option>
              <option value="rotork">ROTORK</option>
              <option value="goetvalve">GOETVALVE</option>
            </select>
            <button className={`p-2 rounded ${coilForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleCoilSubmit}>
              {coilForm.id ? "Update Coil" : "Add Coil"}
            </button>
          </div>
        </div>

        {/* Inventory Log */}
        <div className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-4 ">
          <h2 className="text-lg font-semibold mb-2">Inventory Log</h2>
            <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="p-2 rounded bg-zinc-900 text-white w-44 cursor-pointer"
                  style={{
                    colorScheme: 'dark', // 让浏览器用深色日历
                    WebkitAppearance: 'textfield', // Chrome/Edge
                    MozAppearance: 'textfield',     // Firefox
                    appearance: 'textfield',
                  }}
                />
                <button
                  onClick={() => fetchInventoryLog(searchDate)}
                  className="bg-blue-600 px-4 py-2 rounded"
                >
                  Filter
                </button>
                <button
                  onClick={() => { setSearchDate(""); fetchInventoryLog(""); }}
                  className="bg-gray-600 px-4 py-2 rounded"
                >
                  Deselect
                </button>
            </div>

          <ul className="space-y-2 overflow-auto max-h-117">
            {inventoryLog.map((entry) => {
              const product = products.find(p => p.id === entry.product_id) || {};
              const entryCoil = coil.find(c => c.id === Number(entry.coil_id))
                || coil.find(c => c.name === product.name && c.voltage === entry.voltage) || {};

              //console.log("matching coil for log entry:", entry.id, entry.coil_id, entryCoil);
              {(entry.voltage || entryCoil.voltage) && <>Voltage: {entry.voltage || entryCoil.voltage} | </>}

              return (
                <li key={entry.id} className="border-b border-zinc-700 pb-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span>
                      <strong>{product.name}</strong> — {entry.action} {entry.quantity} — {formatDate(entry.action_date)} — Company: {entry.company_sold_to || "N/A"}
                    </span>
                    <div className="flex gap-2">
                      <button className="bg-yellow-600 px-2 rounded" onClick={() => setLogForm(entry)}>Edit</button>
                      <button className="bg-red-600 px-2 rounded" onClick={() => handleLogDelete(entry.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-300">
                    {product.connection && <>Connection: {product.connection} | </>}
                    {entryCoil.voltage && <>Voltage: {entryCoil.voltage} | </>}
                    {product.max_pressure && <>Pressure Range: {product.max_pressure} | </>}
                    {product.medium_temperature && <>Temperature: {product.medium_temperature}</>}
        
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 添加/编辑 log */}
          <div className="flex flex-col gap-2 mt-2">
            {/* Mode Selector */}
            <select name="mode" value={logForm.mode} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="product">Body Only</option>
              <option value="coil">Coil Only</option>
              <option value="both">Both</option>
            </select>

            <select name="product_id" value={logForm.product_id} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="">Select Product</option>
              {products.map((p)=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select name="action" value={logForm.action} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
           <input
            type="number"
            name="quantity"
            value={logForm.quantity}
            onChange={(e) => {
              const val = Math.max(0, Math.floor(+e.target.value || 0)); // 取整数且不小于0
              setLogForm({ ...logForm, quantity: val });
            }}
            placeholder="Quantity"
            className="p-2 rounded bg-zinc-900 text-white"
            min={0}
            step={1}
          />

            {/* voltage 选择框 */}
            {logForm.mode !== "product" && (
              <select name="voltage" value={logForm.voltage} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
                <option value="">Select Voltage</option>
                {[...new Set(coil.map(c => c.voltage).filter(v => v))].map((v, i) => (  
                  <option key={i} value={v}>{v}</option>
                ))}
              </select>
            )}

            {logForm.action === "OUT" && (
              <input
                type="text"
                name="company_sold_to"
                value={logForm.company_sold_to || ""}
                onChange={(e) => handleChange(e, "log")}
                placeholder="Company Sold To"
                className="p-2 rounded bg-zinc-900 text-white"
              />
            )}

            <button className={`p-2 rounded ${logForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleLogSubmit}>
              {logForm.id ? "Update Log" : "Add Log"}
            </button>
          </div>
        </div>



      </div>
    </div>
  );
}
