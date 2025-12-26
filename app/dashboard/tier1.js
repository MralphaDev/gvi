"use client";
import React from "react";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { FiMenu } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

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
const [productForm, setProductForm] = useState({
  id: "",
  name: "",
  price: "",
  model_number: "",
  manufacturer: "",
  connection: "",
  inner_diameter: "",
  max_pressure: { min: "", max: "" },           // 改成对象
  temperature_range: { min: "", max: "" },     // 改成对象
  current_inventory: "",
  src: ""
});

  const [startIndex, setStartIndex] = useState(0); // 当前显示的起始索引
  const [logForm, setLogForm] = useState({ id: "", product_id: "", action: "IN", quantity: "",company_sold_to: "" ,voltage:"" , coil_id: null, mode: ""});
  const [searchProduct, setSearchProduct] = useState("");
  const [searchCoil, setSearchCoil] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCoilSearching, setIsCoilSearching] = useState(false);
  const [searchDate, setSearchDate] = useState("");

// state
const [reportType, setReportType] = useState("monthly");
const [reportData, setReportData] = useState([]);
const [reportValue, setReportValue] = useState('');      // 选中的年份/月/季度

//const [page, setPage] = React.useState(1);
const [selectedCompany, setSelectedCompany] = React.useState(""); // 默认显示全部

const [imagePreview, setImagePreview] = useState(null);

 const [menuOpen, setMenuOpen] = useState(false);

const [onProductEdit, setOnProductEdit] = useState(false);
const [onCoilEdit, setOnCoilEdit] = useState(false);

const fields = [
  { name: "name", placeholder: "新产品名" },
  { name: "price", placeholder: "价格", type: "number" },
  { name: "model_number", placeholder: "型号" },
  { name: "connection", placeholder: "连接" },
  { name: "inner_diameter", placeholder: "内径" },
  { name: "max_pressure", placeholder: "最大压力" },
  { name: "temperature_range", placeholder: "温度范围" },
  { name: "current_inventory", placeholder: "库存数量", type: "number" },
];

  // fetch products & log
  useEffect(() => {
    fetchProducts();
    fetchInventoryLog();
    fetchCoil();
  }, []);

  // 每次 inventoryLog 或 reportType 改变时计算报表
useEffect(() => {
  generateReport();
}, [inventoryLog, reportType]);

// 可选年份
const availableYears = Array.from(new Set(inventoryLog.map(l => new Date(l.action_date).getFullYear())));

// 可选月份
const availableMonths = reportType==='monthly' && reportValue
    ? Array.from(new Set(
        inventoryLog
          .filter(l => new Date(l.action_date).getFullYear() === +reportValue.split('-')[0])
          .map(l => new Date(l.action_date).getMonth() + 1)
      ))
    : [];
    
const bestSellers = reportData
  .sort((a, b) => (b.quantity ) - (a.quantity))
  .slice(0, 5)
  .map(r => ({ name: r.product_name, quantity: r.quantity }));

const generateReport = (type, value) => {
    let filteredLogs = inventoryLog.filter(log => log.action === "OUT");

    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.action_date);
      if(type === 'yearly') {
        return logDate.getFullYear() === +value;
      } else if(type === 'monthly') {
        const [year, month] = value.split('-');
        return logDate.getFullYear() === +year && logDate.getMonth() === +month - 1;
      } else if(type === 'seasonal') {
        const [year, season] = value.split('-');
        const logSeason = Math.floor(logDate.getMonth()/3) + 1;
        return logDate.getFullYear() === +year && logSeason === +season;
      }
      return true;
    });

  const map = {};
  filteredLogs.forEach(log => {
    const product = products.find(p => p.id === log.product_id);
    if(!product) return;
    //product name指的是product的model number
    if(!map[log.product_id]) map[log.product_id] = { product_name: product.model_number, quantity: 0, sales: 0, price: Number(product.price || 0) };
    map[log.product_id].quantity += log.quantity;
    map[log.product_id].sales += log.quantity * Number(product.price || 0);
  });

  setReportData(Object.values(map).sort((a,b)=>b.quantity - a.quantity));
}

// 导出 PDF
const exportPDF = () => {
  const doc = new jsPDF();
  doc.text(`${reportType.toUpperCase()} Report`, 14, 20);

  // 直接用 autoTable(doc, {...})
  autoTable(doc, {
    head: [["Product", "Quantity Sold", "Sales/Euro"]],
    body: reportData.map(r => [r.product_name, r.quantity, (r.quantity * Number(r.price)).toFixed(2)]),
    startY: 30, // 避免覆盖标题
  });

  doc.save(`${reportType}_report.pdf`);
};

const fetchCoil = async () => {
  const res = await fetch(`/api/coil${searchProduct ? `?search=${searchProduct}` : ""}`);
  //console.log("fetch coil response:", res);
  const data = await res.json();
  setCoil(data);
};

const handleCoilSubmit = async () => {
  try {
    const voltageUnit = document.querySelector('select[name="voltageUnit"]').value;
    const uploadData = {
      ...coilForm,
      voltage: `${coilForm.voltage}${voltageUnit}`
    };

    const method = coilForm.id ? "PUT" : "POST";
    const res = await fetch("/api/coil", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uploadData),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(`线圈上传失败,可能是添加了重复电压和型号对：${data.error || "未知错误"}`);
      return;
    }

    fetchCoil(); // 刷新列表
    setCoilForm({ id: null, name: "", voltage: "", inventory: 0, manufacturer: "" });
    alert("线圈上传成功");
  } catch (err) {
    alert(`线圈上传失败：${err.message}`);
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
  alert("操作成功！请考虑上传或更新对应线圈！")
setProductForm({
  id: "",
  name: "",
  price: "",
  model_number: "",
  manufacturer: "",
  connection: "",
  inner_diameter: "",
  max_pressure: { min: "", max: "" },           // 改成对象
  temperature_range: { min: "", max: "" },      // 改成对象
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
//能修复uncontrolled → controlled bug 

setOnProductEdit(false)
setOnCoilEdit(false)

  fetchProducts();
}else{
  const data = await res.json();
  
 alert((data.error || "") + "错误，添加失败，请重试");

  console.log("111"+ data.error);
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
  // 用 model_id 匹配 coil
  const productModelId = products.find(p => p.id === +logForm.product_id)?.model_id;
  const matchedCoil = coil.find(c =>
    c.model_id === productModelId &&
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
    setLogForm({ id: "", product_id: "", action: "IN", quantity: 0, voltage: "", company_sold_to: "", coil_id: null, mode: "" });

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

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 本地预览
  setImagePreview(URL.createObjectURL(file));

  // 上传
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  if (data.url) {
    setProductForm({ ...productForm, src: data.url });
  }
};


  return (
    <div className="min-h-screen p-10 bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">科延自动化库存管理系统</h1>
      {/* Curtain Menu ICON DIV*/}
      <div className="fixed top-4 right-4 z-[9999]">
        <button
          onClick={() => {
            setMenuOpen(!menuOpen) 
            setSearchProduct("");
            setIsSearching(false);
            fetch(`/api/products`)
              .then(res => res.json())
              .then(data => setProducts(data));
            
            setSearchCoil("");
            setIsCoilSearching(false);
              fetch(`/api/coil`)
                .then(res => res.json())
                .then(data => setCoil(data));
          }}
          className="p-3 bg-zinc-900 rounded-full shadow hover:bg-zinc-800 transition"
        >
          <FiMenu size={24} />
          
        </button>
      </div>
       {/* Fullscreen Curtain Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-black z-[999]"
          >

            {/* Content */}
            <div className="h-full grid grid-cols-2 gap-6 p-8  ">
              <div className="bg-zinc-900 rounded-lg overflow-y-auto">
                {/* Product Inventory */}
                <div className="bg-zinc-800 rounded-xl p-4 overflow-auto flex flex-col gap-4">
                  <h2 className="text-lg font-semibold mb-2">阀体库存</h2>

                  {/* Company Filter Dropdown */}
                  <div className="mb-2">
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="p-2 rounded bg-zinc-900 text-white"
                    >
                      <option value="">按工厂筛选以下阀体视图</option>
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
                      placeholder="按阀体型号搜索..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="p-2 rounded bg-zinc-900 text-white flex-1"
                    />
                    <button 
                      onClick={() => {
                        fetchProducts(searchProduct);
                        setIsSearching(true);
                      }} 
                      className="bg-blue-600 px-4 py-2 rounded"
                    >
                      搜索
                    </button>
                    
                    {isSearching && (
                      <button 
                        onClick={() => { 
                          setSearchProduct("");
                          setIsSearching(false);
                          fetch(`/api/products`)
                            .then(res => res.json())
                            .then(data => setProducts(data));
                        }} 
                        className="bg-gray-600 px-4 py-2 rounded"
                      >
                        取消搜索
                      </button>
                    )}
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
                              <span className="w-20">库存: {p.current_inventory}</span>
                              <span className="w-24">型号:<br/>{p.model_number}</span>
                              <span className="w-20">内径: {p.inner_diameter ?? "-"}</span>
                              <span className="w-24">温度范围: {p.temperature_range ?? "-"}</span>
                              <span className="w-20">出售价格: {p.price ?? "-"}<br/> Euro</span>
                              <span className="w-28">最大压力: {p.max_pressure ?? "-"}</span>
                              <span className="w-24">连接: {p.connection ?? "-"}</span>
                            </div>

                            <div className="flex gap-2 ml-auto">
                              {!onProductEdit &&(<button
                                className="bg-yellow-600 px-2 rounded"
                                onClick={() => {
                                  setOnProductEdit(true); // 开启编辑
                                  setProductForm({
                                    ...p,
                                  
                                    max_pressure: p.max_pressure ? (() => {
                                      const [min, max] = p.max_pressure.split("bar-");
                                      return { min, max };
                                    })() : { min: "", max: "" },
                                    temperature_range: p.temperature_range ? (() => {
                                      const [min, max] = p.temperature_range.split("℃-");
                                      return { min, max };
                                    })() : { min: "", max: "" }
                                  });
                                }}
                              >
                                编辑
                              </button>)}

                              <button className="bg-red-600 px-2 rounded" onClick={() => handleProductDelete(p.id)}>删除</button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>


                  {/* Product Form */}
                  <div className="flex flex-col gap-2 mt-2">
                    {onProductEdit && (
                      <div className=" z-50">
                        <button
                          className="bg-red-600 px-3 py-1 rounded shadow hover:bg-red-500 transition"
                          onClick={() => setOnProductEdit(false)}
                        >
                          取消编辑
                        </button>
                      </div>
                    )}
                  {fields.slice(startIndex, startIndex + 4).map((field, i) => {
                      // 新产品名
                      if (field.name === "name") {
                        return (
                          <select
                            key={i}
                            value={productForm.name}
                            onChange={(e) =>
                              setProductForm({ ...productForm, name: e.target.value })
                            }
                            className="p-2 rounded bg-zinc-900 text-white w-35"
                          >
                            <option value="" disabled>选择阀门类型</option>
                            {[...new Set(products.map(p => p.name))].map((name, idx) => (
                              <option key={idx} value={name}>{name}</option>
                            ))}
                          </select>

                        );
                      }

                      // 价格
                      if (field.name === "price") {
                        return (
                          <div key={i} className="flex gap-1 items-center">
                            <input
                              type="number"
                              min={0}
                              value={productForm.price}
                              placeholder="价格"
                              className="p-2 rounded bg-zinc-900 text-white w-35"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (+val < 0) { alert("价格必须是非负数字"); return; }
                                setProductForm({ ...productForm, price: val });
                              }}
                            />
                            <span className="text-gray-400">euro</span>
                          </div>
                        );
                      }

                      // 内径
                      if (field.name === "inner_diameter") {
                        return (
                          <div key={i} className="flex gap-1 items-center">
                            <input
                              type="number"
                              min={0}
                              value={productForm.inner_diameter}
                              placeholder="内径"
                              className="p-2 rounded bg-zinc-900 text-white w-24"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (+val < 0) { alert("内径必须是非负数字"); return; }
                                setProductForm({ ...productForm, inner_diameter: val });
                              }}
                            />
                            <span className="text-gray-400">mm</span>
                          </div>
                        );
                      }

                      // 最大压力（两个输入框）
                      if (field.name === "max_pressure") {
                        const p = productForm.max_pressure;
                        return (
                          <div key={i} className="flex gap-1 items-center">
                            <input
                              type="number"
                              min={0}
                              value={p.min}
                              placeholder="最小压力"
                              className="p-2 rounded bg-zinc-900 text-white w-20"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (+val < 0) { alert("压力不能为负"); return; }
                                setProductForm({ ...productForm, max_pressure: { ...p, min: val } });
                              }}
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="number"
                              min={0}
                              value={p.max}
                              placeholder="最大压力"
                              className="p-2 rounded bg-zinc-900 text-white w-20"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (+val < 0) { alert("压力不能为负"); return; }
                                setProductForm({ ...productForm, max_pressure: { ...p, max: val } });
                              }}
                            />
                            <span className="text-gray-400">bar</span>
                          </div>
                        );
                      }

                      // 温度范围（两个输入框，可负）
                      if (field.name === "temperature_range") {
                        const t = productForm.temperature_range;
                        return (
                          <div key={i} className="flex gap-1 items-center">
                            <input
                              type="number"
                              value={t.min}
                              placeholder="最小温度"
                              className="p-2 rounded bg-zinc-900 text-white w-20"
                              onChange={(e) => {
                                setProductForm({ ...productForm, temperature_range: { ...t, min: e.target.value } });
                              }}
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="number"
                              value={t.max}
                              placeholder="最大温度"
                              className="p-2 rounded bg-zinc-900 text-white w-20"
                              onChange={(e) => {
                                setProductForm({ ...productForm, temperature_range: { ...t, max: e.target.value } });
                              }}
                            />
                            <span className="text-gray-400">℃</span>
                          </div>
                        );
                      }

                      // 其他字段
                      return (
                        <input
                          key={i}
                          name={field.name}
                          type={field.type || "text"}
                          value={productForm[field.name]}
                          placeholder={field.placeholder}
                          className="p-2 rounded bg-zinc-900 text-white w-35"
                          onChange={(e) =>
                            setProductForm({ ...productForm, [field.name]: e.target.value })
                          }
                        />
                      );
                  })}

                  {/* 只有在最后一页才显示 manufacturer 下拉框*/}
                  {startIndex + 4 >= fields.length && (
                    <>
                      <select
                        name="manufacturer"
                        value={productForm.manufacturer || ""}
                        onChange={(e) =>
                          setProductForm({ ...productForm, manufacturer: e.target.value })
                        }
                        className="p-2 rounded bg-zinc-900 text-white w-35"
                      >
                        <option value="">选择制造商</option>
                      <option value="ceme">CEME</option>
                      <option value="jaksa">JAKSA</option>
                      <option value="saturn">SATURN</option>
                      <option value="rotork">ROTORK</option>
                      <option value="goetvalve">GOETVALVE</option>
                      </select>
                      <label className="p-2 rounded bg-zinc-900 text-white cursor-pointer w-35">
                        点击上传阀体图片:
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      {/* 预览 */}
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="预览"
                          className="w-40 h-40 object-contain mt-2 border"
                        />
                      )}

                      <button
                        className={`p-2 rounded ${
                          onProductEdit && productForm.id ? "bg-blue-600" : "bg-green-600"
                        }`}
                        onClick={() => {
                          handleProductSubmit();
                          setStartIndex(0);
                        }}
                      >
                        {onProductEdit && productForm.id ? "更新阀体信息" : "增加阀体信息"}
                      </button>
                    </>
                  )}


                    <div className="flex gap-2 mt-2">
                      <button
                        disabled={startIndex === 0}
                        onClick={() => setStartIndex(startIndex - 4)}
                        className="bg-gray-600 px-4 py-2 rounded"
                      >
                        上一页
                      </button>
                      <button
                        disabled={startIndex + 4 >= fields.length}
                        onClick={() => setStartIndex(startIndex + 4)}
                        className="bg-gray-600 px-4 py-2 rounded"
                      >
                        下一页
                      </button>

                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-lg overflow-y-auto">
                  {/* Coil Inventory */}
                <div className="bg-zinc-800 rounded-xl p-4 overflow-auto flex flex-col gap-4">
                  <h2 className="text-lg font-semibold mb-2">线圈库存</h2>

                  {/* Manufacturer Filter Dropdown */}
                  <div className="mb-2">
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="p-2 rounded bg-zinc-900 text-white"
                    >
                      <option value="">按照工厂筛选以下线圈视图</option>
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
                        placeholder="按线圈对应的阀体型号搜索..."
                        value={searchCoil}
                        onChange={(e) => setSearchCoil(e.target.value)}
                        className="p-2 rounded bg-zinc-900 text-white flex-1"
                      />
                      <button 
                        onClick={() => {
                          fetch(`/api/coil?search=${searchCoil}`)
                            .then(res => res.json())
                            .then(data => setCoil(data));

                          setIsCoilSearching(true);
                        }} 
                        className="bg-blue-600 px-4 py-2 rounded"
                      >
                        搜索
                      </button>
                      
                      {isCoilSearching && (
                        <button 
                          onClick={() => { 
                            setSearchCoil("");
                            setIsCoilSearching(false);
                            fetch(`/api/coil`)
                              .then(res => res.json())
                              .then(data => setCoil(data));
                          }} 
                          className="bg-gray-600 px-4 py-2 rounded"
                        >
                          取消搜索
                        </button>
                      )}
                  </div>

                  {/* Coil List */}
                  <ul className="space-y-2 overflow-auto max-h-100">
                    {coil
                      .filter(c => !selectedCompany || c.manufacturer === selectedCompany)
                      .map((c) => (
                        
                        <li key={c.id} className="border-b border-zinc-700 pb-1 flex justify-between items-center">
                          <span><strong>{c.name}</strong> — 库存: {c.inventory}</span>
                          {c.voltage && <span>电压: {c.voltage}</span>}
                          <span>制造商: {c.manufacturer}</span>
                          <div className="flex gap-2">
                            {!onCoilEdit&&
                            (<button className="bg-yellow-600 px-2 rounded" 
                              onClick={() => 
                              {
                              setOnCoilEdit(true)
                              setCoilForm(c)
                              
                              }
                              }>
                              编辑
                            </button>
                            
                            )}
                            <button className="bg-red-600 px-2 rounded" onClick={() => handleCoilDelete(c.id)}>删除</button>
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
                      className="p-2 rounded bg-zinc-900 text-white w-35"
                    >
                      <option value=""disabled>选择线圈型号</option>
                      {products.map((p) => (
                        <option key={p.model_number} value={p.model_number}>
                          {p.model_number}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        name="voltage"
                        value={coilForm.voltage}
                        onChange={(e) => setCoilForm({ ...coilForm, voltage: e.target.value })}
                        placeholder="电压"
                        className="w-20 p-1 rounded bg-zinc-900 text-white text-sm"
                      />

                      <select
                        name="voltageUnit"
                        defaultValue="VAC"
                        className="w-13 p-1 rounded bg-zinc-900 text-white text-sm"
                      >
                        <option value="VAC">VAC</option>
                        <option value="VDC">VDC</option>
                      </select>
                    </div>



                  <input
                    type="number"
                    name="inventory"
                    value={coilForm.inventory}
                    onChange={(e) => {
                      const val = Math.max(0, Math.floor(+e.target.value || ""));
                      setCoilForm({ ...coilForm, inventory: val });
                    }}
                    placeholder="库存数量"
                    className="p-2 rounded bg-zinc-900 text-white w-35"
                    min={0}
                    step={1}
                  />
                    <select name="manufacturer" value={coilForm.manufacturer} onChange={(e) => handleChange(e, "coil")} className="p-2 rounded bg-zinc-900 text-white w-35">
                      <option value="" disabled hidden>选择生产商</option>
                      <option value="ceme">CEME</option>
                      <option value="jaksa">JAKSA</option>
                      <option value="saturn">SATURN</option>
                      <option value="rotork">ROTORK</option>
                      <option value="goetvalve">GOETVALVE</option>
                    </select>
                    <button className={`p-2 rounded ${coilForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleCoilSubmit}>
                      {coilForm.id ? "更新线圈" : "添加线圈"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard */}
      <div className="grid grid-cols-2 gap-6 ">

        {/* Inventory Log */}
        <div className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-4 ">
          <h2 className="text-lg font-semibold mb-2">库存流水明细</h2>
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
              const product = products.find(p => p.id === entry.product_id) || {}; //all products with matching pid (id == logentry.product_id)
              //console.log("products inventorylog:",product)
              const entryCoil = coil.find(c => c.id === Number(entry.coil_id))
                || coil.find(c => c.name === product.name && c.voltage === entry.voltage) || {};

              //console.log("matching coil for log entry:", entry.id, entry.coil_id, entryCoil);
              {(entry.voltage || entryCoil.voltage) && <>Voltage: {entry.voltage || entryCoil.voltage} | </>}

              return (
                <li key={entry.id} className="border-b border-zinc-700 pb-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span>
                      <strong>{product.model_number}</strong>— {product.name} | 操作：{entry.action} {entry.quantity}个 | 日期：{formatDate(entry.action_date)} | 售卖对象: {entry.company_sold_to || "N/A"} 
                    </span>
                    <div className="flex gap-2">
                      <button className="bg-yellow-600 px-2 rounded" onClick={() => setLogForm(entry)}>Edit</button>
                      <button className="bg-red-600 px-2 rounded" onClick={() => handleLogDelete(entry.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-300">
                    {product.connection && <>连接: {product.connection} | </>}
                    {entryCoil.voltage && <>电压: {entryCoil.voltage} | </>}
                    {product.max_pressure && <>压力范围: {product.max_pressure} | </>}
                    {product.medium_temperature && <>温度范围: {product.medium_temperature}</>}
        
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 添加/编辑 log */}
          <div className="flex flex-col gap-2 mt-2">
            {/* Mode Selector */}
            <select name="mode" value={logForm.mode} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="" disabled>请选择出入账模式</option>
               <option value="product">仅进/出货阀体</option>
              <option value="coil">仅进/出货线圈</option>
              <option value="both">进/出货一套阀体+线圈 </option>
            </select>
            {/* product id is auto filled in here */}
            <select name="product_id" value={logForm.product_id} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="">选择型号</option>
              {products.map((p)=> <option key={p.id} value={p.id}>{p.model_number}</option>)}
            </select>
            <select name="action" value={logForm.action} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="IN">进货</option>
              <option value="OUT">出货</option>
            </select>
           <input
            type="number"
            name="quantity"
            value={logForm.quantity}
            onChange={(e) => {
              const val = Math.max(0, Math.floor(+e.target.value || 0)); // 取整数且不小于0
              setLogForm({ ...logForm, quantity: val });
            }}
            placeholder="数量"
            className="p-2 rounded bg-zinc-900 text-white"
            min={0}
            step={1}
          />

            {/* voltage 选择框 */}
            {logForm.mode !== "product" && (
              <select name="voltage" value={logForm.voltage} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
                <option value="">选择线圈电压：</option>
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
                placeholder="售卖对象："
                className="p-2 rounded bg-zinc-900 text-white"
              />
            )}

              {logForm.action === "IN" && (
              <input
                type="text"
                name="company_sold_to"
                value={logForm.company_sold_to || ""}
                onChange={(e) => handleChange(e, "log")}
                placeholder="进货对象："
                className="p-2 rounded bg-zinc-900 text-white"
              />
            )}

            <button className={`p-2 rounded ${logForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleLogSubmit}>
              {logForm.id ? "Update Log" : "Add Log"}
            </button>
          </div>
        </div>

        {/* Report Section */}
        <div className="bg-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">销售报表</h2>

        {/* Report Type Buttons */}
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            className={`px-4 py-2 rounded w-full sm:w-auto ${
              reportType === 'monthly' ? 'bg-blue-600' : 'bg-gray-600'
            }`}
            onClick={() => setReportType('monthly')}
          >
            月报表
          </button>

          <button
            className={`px-4 py-2 rounded w-full sm:w-auto ${
              reportType === 'seasonal' ? 'bg-blue-600' : 'bg-gray-600'
            }`}
            onClick={() => setReportType('seasonal')}
          >
            季报表
          </button>

          <button
            className={`px-4 py-2 rounded w-full sm:w-auto ${
              reportType === 'yearly' ? 'bg-blue-600' : 'bg-gray-600'
            }`}
            onClick={() => setReportType('yearly')}
          >
            年报表
          </button>

          <button
            className="bg-green-600 px-4 py-2 rounded w-full sm:w-auto sm:ml-auto"
            onClick={exportPDF}
          >
            下载PDF
          </button>
        </div>


          {/* Report Value Selector */}
          <div className="flex gap-2 mb-4">
            {reportType === 'yearly' && (
              <select value={reportValue} onChange={e => setReportValue(e.target.value)} className="p-2 rounded bg-zinc-900 text-white">
                <option value="">选择年</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {reportType === 'monthly' && (
              <>
                <select value={reportValue.split('-')[0] || ''} onChange={e => setReportValue(`${e.target.value}-1`)} className="p-2 rounded bg-zinc-900 text-white">
                  <option value="">年</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={reportValue.split('-')[1] || ''} onChange={e => setReportValue(`${reportValue.split('-')[0]}-${e.target.value}`)} className="p-2 rounded bg-zinc-900 text-white">
                  <option value="">月</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </>
            )}
            {reportType === 'seasonal' && (
              <>
                <select value={reportValue.split('-')[0] || ''} onChange={e => setReportValue(`${e.target.value}-1`)} className="p-2 rounded bg-zinc-900 text-white">
                  <option value="">年</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={reportValue.split('-')[1] || ''} onChange={e => setReportValue(`${reportValue.split('-')[0]}-${e.target.value}`)} className="p-2 rounded bg-zinc-900 text-white">
                  <option value="">季</option>
                  {[1,2,3,4].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            <button className="bg-blue-600 px-4 py-2 rounded" onClick={() => generateReport(reportType, reportValue)}>Generate</button>
          </div>

          {/* Report Table */}
          <table className="w-full text-left border border-zinc-700">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="px-2 py-1">产品</th>
                <th className="px-2 py-1">售卖数量</th>
                <th className="px-2 py-1">销售额/Euro</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((r,i) => (
                <tr key={i} className="border-b border-zinc-700">
                  <td className="px-2 py-1">{r.product_name}</td>
                  <td className="px-2 py-1">{r.quantity}</td>
                  <td className="px-2 py-1">{(r.quantity * Number(r.price)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Best Seller Chart */}
        <div className="bg-zinc-800 rounded-xl p-4 mt-6">
          <h2 className="text-lg font-semibold mb-2">Top 5 Best Seller</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={bestSellers}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis type="number" stroke="#fff" />
              <YAxis dataKey="name" type="category" stroke="#fff" width={150}/>
              <Tooltip formatter={(value) => value} />
              <Bar dataKey="quantity" fill="#00f6ff" animationDuration={1500}>
                <LabelList dataKey="quantity" position="right"  />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

        </div>

        {/* Top Companies Chart */}
        <div className="bg-zinc-800 rounded-xl p-4 mt-6">
          <h2 className="text-lg font-semibold mb-2 text-white">Top Companies</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={(() => {
                const map = {};

                inventoryLog.forEach(log => {
                  if (log.action !== "OUT") return;

                  const company = log.company_sold_to || "Unknown Company";

                  if (!map[company]) {
                    map[company] = { totalQuantity: 0, products: {} };
                  }

                  map[company].totalQuantity += log.quantity;

                  // 直接用后端返回的 model_number
                  const modelNumber = log.model_number || "Unknown Model";

                  if (!map[company].products[modelNumber]) {
                    map[company].products[modelNumber] = 0;
                  }
                  map[company].products[modelNumber] += log.quantity;
                });

                return Object.entries(map)
                  .map(([company, data]) => ({
                    company,
                    totalQuantity: data.totalQuantity,
                    topProducts: Object.entries(data.products)
                      .map(([model_number, quantity]) => ({ model_number, quantity }))
                      .sort((a, b) => b.quantity - a.quantity)
                      .slice(0, 3)
                  }))
                  .sort((a, b) => b.totalQuantity - a.totalQuantity)
                  .slice(0, 5);
              })()}

              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis type="number" stroke="#fff" />
              <YAxis dataKey="company" type="category" stroke="#fff" width={180} />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const company = data.company;
                    const topProducts = data.topProducts || [];
                    return (
                      <div className="bg-zinc-900 text-white p-2 rounded shadow-lg">
                        <p className="font-bold">{company}</p>
                        <p>Total Quantity: {data.totalQuantity}</p>
                        {topProducts.length > 0 && (
                          <>
                            <p className="mt-1 font-semibold">Top Products:</p>
                            <ul className="list-disc ml-4">
                              {topProducts.map((p, i) => (
                                <li key={i}>{p.model_number} ({p.quantity})</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar
                dataKey="totalQuantity"
                fill="#F59E0B"
                animationDuration={1500}
              >
                <LabelList dataKey="totalQuantity" position="right" formatter={(val) => val} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>




      </div>
    </div>
  );
}
