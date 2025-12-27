"use client";
import React from "react";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import "jspdf-fonts"; // 📌 自动包含了中文字体
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { FiMenu } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import "jspdf/dist/polyfills.umd"; // 确保兼容
import html2canvas from 'html2canvas-pro';
import autoTable from "jspdf-autotable";

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
  const [logForm, setLogForm] = useState({ id: "", product_id: "", action: "IN", quantity: "",company_sold_to: "" ,voltage:"" , coil_id: null, mode: "",export_price:"",import_price:""});
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
const [onLogEdit, setOnLogEdit] = useState(false);

const [popupProduct, setPopupProduct] = useState(null);

const fields = [
  { name: "name", placeholder: "新产品名" },
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
    const d = new Date(log.action_date);
    if (type === "yearly") return d.getFullYear() === +value;
    if (type === "monthly") {
      const [y, m] = value.split("-");
      return d.getFullYear() === +y && d.getMonth() === +m - 1;
    }
    if (type === "seasonal") {
      const [y, s] = value.split("-");
      return d.getFullYear() === +y && Math.floor(d.getMonth() / 3) + 1 === +s;
    }
    return true;
  });

  const map = {};

  filteredLogs.forEach(log => {
    const product = products.find(p => p.id === log.product_id);
    if (!product) return;

    if (!map[log.product_id]) {
      map[log.product_id] = {
        product_type: product.name,
        product_name: product.model_number,
        quantity: 0,
        sales: 0,
        voltages: [],
        companies: [],
      };
    }

    map[log.product_id].quantity += log.quantity;
    map[log.product_id].sales += log.quantity * Number(log.export_price || 0);
    map[log.product_id].voltages.push(String(log.voltage));
    map[log.product_id].companies.push(log.company_sold_to);
  });

  setReportData(
    Object.values(map)
      .map(r => ({
        product_type: r.product_type,
        product_name: r.product_name,
        quantity: r.quantity,
        sales: r.sales,
        voltage: [...new Set(r.voltages)].join(" / "),
        company_sold_to: [...new Set(r.companies)].join("，"),
      }))
      .sort((a, b) => b.quantity - a.quantity)
  );
};


// 导出 PDF

const exportPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  // 标题
  doc.setFontSize(18);
  doc.text("Sales Report", 14, 20);

  let y = 40; // 当前纵坐标

  // 按厂商分组
  const grouped = reportData.reduce((acc, r) => {
    const product = products.find(p => p.model_number === r.product_name);
    const manufacturer = product?.manufacturer || "Unknown Manufacturer";
    if (!acc[manufacturer]) acc[manufacturer] = [];
    acc[manufacturer].push(r);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([manufacturer, items]) => {
    // 换页检查
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // 厂商名
    doc.setFontSize(14);
    doc.text(manufacturer, 14, y);
    y += 10;

    // 表头
    doc.setFontSize(10);
    doc.text("No.  Name              Model             Voltage   Qty   Buyer                    Sales", 14, y);
    y += 7;

    // 数据行
    items.forEach((item, idx) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      const line = `${(idx + 1).toString().padEnd(4)} ${ (item.product_type || '').padEnd(18) } ${ (item.product_name || '').padEnd(18) } ${ (item.voltage || '').padEnd(10) } ${ (item.quantity || 0).toString().padEnd(6) } ${ (item.company_sold_to || '').padEnd(25) } ${ item.sales || 0 }`;

      doc.text(line, 14, y);
      y += 7;
    });

    // 合计
    const totalQty = items.reduce((s, r) => s + (r.quantity || 0), 0);
    const totalSales = items.reduce((s, r) => s + (r.sales || 0), 0);
    doc.setFontSize(11);
    doc.text(`Total Quantity: ${totalQty}    Total Sales: ${totalSales} USD`, 14, y);
    y += 15;
  });

  doc.save("sales_report.pdf");
};

const fetchCoil = async () => {
  const res = await fetch(`/api/coil${searchProduct ? `?search=${searchProduct}` : ""}`);
  //console.log("fetch coil response:", res);
  const data = await res.json();
  setCoil(data);
};

const handleCoilSubmit = async () => {
  try {
    // 必填字段校验
    const fieldMap = {
      name: "型号",
      voltage: "电压",
      inventory: "库存数量",
      manufacturer: "生产厂家",
    };

    // 必填字段校验
    const requiredFields = ["name", "voltage", "inventory", "manufacturer"];
    for (let field of requiredFields) {
      if (!coilForm[field] && coilForm[field] !== 0) { // inventory 为0也算填了
        alert(`请填写 ${fieldMap[field]}`);
        return;
      }
    }
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
  if (!confirm("您确定要删除该线圈吗?")) return;

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
  // 中文字段映射
  const fieldMap = {
    name: "阀体类型",
    model_number: "型号",
    manufacturer: "生产厂家",
  };

  // 必填字段
  const requiredFields = ["name", "model_number", "manufacturer"];
  for (let field of requiredFields) {
    if (!productForm[field]) {
      alert(`请填写 ${fieldMap[field]}`);
      return;
    }
  }

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
  category: "",
  src: "",
  model_number: "",
  type: "",
  manufacturer: "",
  connection: "",
  voltage: "",
  max_pressure: { min: "", max: "" },       // 保持对象
  current_inventory: 0,
  inner_diameter: "",                        // 对应 decimal(5,2)
  temperature_range: { min: "", max: "" },   // 保持对象
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
  if (!confirm("您确定要删除该阀体吗?")) return;
  await fetch(`/api/products`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  fetchProducts();
};


const handleLogSubmit = async () => {
  // 必填字段校验
  if (!logForm.mode) {
    alert("请选择出入账模式");
    return;
  }
  if (!logForm.product_id) {
    alert("请选择型号");
    return;
  }
  if (!logForm.action) {
    alert("请选择进货/出货");
    return;
  }
  if (!logForm.quantity) {
    alert("请输入数量");
    return;
  }
  if (logForm.mode !== "product" && !logForm.voltage) {
    alert("请选择电压");
    return;
  }
  if (!logForm.company_sold_to) {
    alert(logForm.action === "IN" ? "请输入进货对象" : "请输入售卖对象");
    return;
  }
  // 用 model_number 匹配 coil
  const productModelId = products.find(p => p.id === +logForm.product_id)?.model_number;
  const matchedCoil = coil.find(c =>
    c.name === productModelId &&
    c.voltage?.trim().toLowerCase() === logForm.voltage?.trim().toLowerCase()
  );
  //console.log("Matched Coil:",matchedCoil)
  
  // 如果没找到 matchedCoil，则报错并退出
  if ((logForm.mode === "coil" || logForm.mode === "both") && !matchedCoil) {
    alert("未找到对应的 Coil，请检查型号和电压！");
    return;
  }

  const logToSubmit = { ...logForm, coil_id: matchedCoil ? matchedCoil.id : null };
  const method = logForm.id ? "PUT" : "POST";

  const res = await fetch("/api/inventory_log", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logToSubmit),
  });

  if (res.ok) {
    alert("操作成功")
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
    setLogForm({ id: "", product_id: "", action: "IN", quantity: 0, voltage: "", company_sold_to: "", coil_id: null, mode: "" ,export_price:"",export_price:""});

    // 更新日志
    fetchInventoryLog();
  }
};

const handleLogDelete = async (id) => {
  if (!id) return alert("Missing log id");
  if (!confirm("您确定要删除该账目吗?")) return;

  try {
    const res = await fetch("/api/inventory_log", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      alert("删除成功");
      setLogForm({ id: "", product_id: "", action: "IN", quantity: 0, voltage: "", company_sold_to: "", import_price: "", export_price: "" });
      fetchInventoryLog();
      fetchProducts();
    } else {
      const data = await res.json();
      alert(`删除失败: ${data.error || "未知错误"}`);
    }
  } catch (err) {
    alert(`删除失败: ${err.message}`);
  }
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
    <div className="min-h-screen md:p-10 bg-black text-white overflow-x-hidden px-4 ">
      <h1 className="text-2xl font-bold mb-6 mt-5 ">科延自动化库存管理系统</h1>
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
            className="fixed overflow-y-auto  inset-0 z-40 bg-black z-[999]"
          >

            {/* Content */}
            <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 md:p-8 md:w-full">
              <div className="bg-zinc-900 rounded-lg md:overflow-y-auto">
                {/* Product Inventory */}
                <div className="bg-zinc-800 rounded-xl p-4 overflow-x-hidden md:overflow-auto flex flex-col md:gap-4 gap-5">
                  <h2 className="text-lg font-semibold mb-2">阀体库存</h2>

                  {/* Company Filter Dropdown */}
                  <div className="mb-2">
                    <select
                      value={selectedCompany || ""}
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

                  <div className="flex flex-col md:flex-row gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="按阀体型号搜索..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="p-2 rounded bg-zinc-900 text-white md:flex-1 min-w-0 w-[30%]"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          fetchProducts(searchProduct);
                          setIsSearching(true);
                        }}
                        className="bg-blue-600 md:px-4 md:py-2 py-1 px-3 rounded md:flex-none"
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
                          className="bg-gray-600 px-4 py-2 rounded  md:flex-none"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>


                  {/* Product List */}
                    <div className="md:overflow-x-auto">
                    <ul className="space-y-4 max-h-100 overflow-y-auto md:min-w-max">
                      {products
                        .filter(p => !selectedCompany || p.manufacturer === selectedCompany)
                        .map(p => (
                          <li
                            key={p.id}
                            className="border-b border-zinc-700 pb-2 flex flex-col md:flex-row gap-1 md:gap-4 items-start md:items-center md:min-w-max"
                          >
                            <img src={p.src} alt={p.name} className="w-20 h-20 object-cover rounded" />

                            <div className="flex flex-wrap md:gap-2 md:min-w-max w-[80%]">
                              <span className="md:w-24 w-1/3"><strong>{p.name}</strong></span>
                              <span className="md:w-22 w-1/3">型号:<br/>{p.model_number}</span>
                              <span className="md:w-26 w-1/3">库存: {p.current_inventory}</span>


                              <span className="hidden md:block w-20">内径: {p.inner_diameter ?? "-" }mm</span>
                              <span className="hidden md:block w-24">温度范围: {p.temperature_range ?? "-"}</span>
                              <span className="hidden md:block w-28">最大压力: {p.max_pressure ?? "-"}</span>
                              <span className="hidden md:block w-24">连接: {p.connection ?? "-"}</span>
                            </div>

                           <div className="flex gap-2 mt-2 md:mt-0 md:ml-auto">
                              {!onProductEdit && (
                                <button
                                  className="bg-yellow-600 px-3 py-1.5 md:px-2 md:py-1 rounded w-auto text-sm md:text-xs"
                                  onClick={() => {
                                    setOnProductEdit(true);
                                    setProductForm({ ...p });
                                  }}
                                >
                                  编辑
                                </button>
                              )}
                              <button
                                className="bg-red-600 px-3 py-1.5 md:px-2 md:py-1 rounded w-auto text-sm md:text-xs"
                                onClick={() => handleProductDelete(p.id)}
                              >
                                删除
                              </button>
                            </div>

                          </li>
                        ))}
                    </ul>

                    </div>


                  {/* Product Form */}
                  <div className="flex flex-col gap-2 mt-2 ">
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

                      const valveTypes = [
                        "气动角座阀",
                        "单向阀",
                        "液氮过滤器",
                        "安全阀",
                        "离心泵",
                        "电磁泵",
                        "压力传感器",
                        "压力开关",
                        "压力表",
                        "温度表",
                        "水用电磁阀",
                        "二位三通电磁阀",
                        "高压电磁阀",
                        "真空电磁阀",
                        "常开电磁阀",
                        "防爆电磁阀",
                        "低温电磁阀",
                        "高温电磁阀"
                      ];
                      if (field.name === "name") {
                        return (
                          <select
                            key={i}
                            value={productForm.name || ""}
                            onChange={(e) =>
                              setProductForm({ ...productForm, name: e.target.value })
                            }
                            className="p-2 rounded bg-zinc-900 text-white w-36"
                          >
                            <option value="" disabled>选择阀门类型</option>
                            {valveTypes.map((type, idx) => (
                              <option key={idx} value={type}>{type}</option>
                            ))}
                          </select>
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
                        className={`w-[25%] p-2 rounded ${
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
                      {startIndex + 4 < fields.length && (
                        <button
                          onClick={() => setStartIndex(startIndex + 4)}
                          className="bg-gray-600 px-4 py-2 rounded"
                        >
                          下一页
                        </button>
                      )}

                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-lg overflow-y-auto">
                  {/* Coil Inventory */}
                <div className="bg-zinc-800 rounded-xl p-4 overflow-auto flex flex-col md:gap-4">
                  <h2 className="text-lg font-semibold mb-2">线圈库存</h2>

                  {/* Manufacturer Filter Dropdown */}
                  <div className="mb-2">
                    <select
                      value={selectedCompany || ""}
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
                  <div className="flex flex-col md:flex-row gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="按线圈对应的阀体型号搜索..."
                        value={searchCoil}
                        onChange={(e) => setSearchCoil(e.target.value)}
                        className="p-2 rounded bg-zinc-900 text-white md:flex-1 min-w-0 w-[30%]"
                      />
                      <button 
                        onClick={() => {
                          fetch(`/api/coil?search=${searchCoil}`)
                            .then(res => res.json())
                            .then(data => setCoil(data));

                          setIsCoilSearching(true);
                        }} 
                        className="bg-blue-600 md:px-4 md:py-2 rounded md:flex-none w-[10%]"
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
                      <li key={c.id} className="border-b border-zinc-700 pb-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        {/* 信息字段 */}
                        <div className="flex flex-col sm:flex-row sm:gap-4">
                          <span><strong>{c.name}</strong> — 库存: {c.inventory}</span>
                          {c.voltage && <span>电压: {c.voltage}</span>}
                          <span>制造商: {c.manufacturer}</span>
                        </div>
                        {/* 按钮 */}
                        <div className="flex gap-2 flex-wrap">
                          {!onCoilEdit && (
                            <button className="bg-yellow-600 px-2 rounded"
                              onClick={() => {
                                setOnCoilEdit(true)
                                setCoilForm(c)
                              }}>
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
                     {onCoilEdit && (
                      <div className=" z-50">
                        <button
                          className="bg-red-600 px-3 py-1 rounded shadow hover:bg-red-500 transition"
                          onClick={() => setOnCoilEdit(false)}
                        >
                          取消编辑
                        </button>
                      </div>
                    )}
                    <select
                      name="name"
                      value={coilForm.name || ""}
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
                    <select name="manufacturer" value={coilForm.manufacturer || ""} onChange={(e) => handleChange(e, "coil")} className="p-2 rounded bg-zinc-900 text-white w-35">
                      <option value="" disabled hidden>选择生产商</option>
                      <option value="ceme">CEME</option>
                      <option value="jaksa">JAKSA</option>
                      <option value="saturn">SATURN</option>
                      <option value="rotork">ROTORK</option>
                      <option value="goetvalve">GOETVALVE</option>
                    </select>
                    <button className={`w-[15%] p-2 rounded ${coilForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleCoilSubmit}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">

        {/* Inventory Log */}
        <div className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-4 ">
          <h2 className="text-lg font-semibold mb-2">库存流水明细</h2>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="p-2 rounded bg-zinc-900 text-white w-full sm:w-44 text-sm sm:text-base cursor-pointer"
              style={{
                colorScheme: 'dark',
                WebkitAppearance: 'textfield',
                MozAppearance: 'textfield',
                appearance: 'textfield',
              }}
            />
            <button
              onClick={() => fetchInventoryLog(searchDate)}
              className="bg-blue-600 px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base w-[20%] sm:w-auto"
            >
              筛选
            </button>
            <button
              onClick={() => { setSearchDate(""); fetchInventoryLog(""); }}
              className="bg-gray-600 px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base w-[20%] sm:w-auto"
            >
              取消
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
              
              const modeMap = {
                product: "仅阀体",
                coil: "仅线圈",
                both: "一套",
              };

              const actionMap = {
                IN: "进货",
                OUT: "售卖",
              };

              const preposition = entry.action === "IN" ? "从" : "给";
              const price = entry.action === 'IN' ? entry.import_price : entry.export_price;
              return (
<li key={entry.id} className="border-b border-zinc-700 pb-1 flex flex-col gap-1 text-sm sm:text-base">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
    <span className="break-words">
      在 {formatDate(entry.action_date)} {preposition} {entry.company_sold_to || "未填写"}，{actionMap[entry.action]} {entry.quantity}个 {product.model_number}（{product.name}，{modeMap[entry.mode] || ""}）金额为：{price*entry.quantity}元
    </span>
    <div className="flex gap-2 mt-1 sm:mt-0 flex-wrap">
      {!onLogEdit && (
        <button className="bg-yellow-600 px-2 rounded text-xs sm:text-sm" onClick={() => {setLogForm(entry);setOnLogEdit(true)}}>编辑</button>
      )}
      <button className="bg-red-600 px-2 rounded text-xs sm:text-sm" onClick={() => handleLogDelete(entry.id)}>删除</button>
    </div>
  </div>
  <div className="text-xs sm:text-sm text-zinc-300 flex flex-wrap gap-2">
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
             {onLogEdit && (
                <div className=" z-50">
                    <button
                      className="bg-red-600 px-3 py-1 rounded shadow hover:bg-red-500 transition"
                      onClick={() => setOnLogEdit(false)}
                    >
                    取消编辑
                  </button>
                </div>
            )}
            {/* Mode Selector */}
            <select name="mode" value={logForm.mode || ""} onChange={(e)=> {handleChange(e,"log")}} className="p-2 rounded bg-zinc-900 text-white">
              <option value="" disabled>请选择出入账模式</option>
               <option value="product">仅进/出货阀体</option>
              <option value="coil">仅进/出货线圈</option>
              <option value="both">进/出货一套阀体+线圈 </option>
            </select>
            {/* product id is auto filled in here */}
            <select name="product_id" value={logForm.product_id || ""} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="">选择型号</option>
              {products.map((p)=> <option key={p.id} value={p.id}>{p.model_number}</option>)}
            </select>
            <select name="action" value={logForm.action || ""} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
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
              <select name="voltage" value={logForm.voltage || ""} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
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

            {/* 进货价格 */}
            {logForm.action === "IN" && (
              <input
                type="number"
                name="import_price"
                value={logForm.import_price || ""}
                onChange={(e) => handleChange(e, "log")}
                placeholder="进货价格:单价，单位元"
                className="p-2 rounded bg-zinc-900 text-white"
                min={0}
                step={0.01}
              />
            )}

            {/* 售卖价格 */}
            {logForm.action === "OUT" && (
              <input
                type="number"
                name="export_price"
                value={logForm.export_price || ""}
                onChange={(e) => handleChange(e, "log")}
                placeholder="售卖价格"
                className="p-2 rounded bg-zinc-900 text-white"
                min={0}
                step={0.01}
              />
            )}




            <button className={`p-2 rounded ${logForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleLogSubmit}>
              {logForm.id ? "更新账目" : "添加账目"}
            </button>
          </div>
        </div>

        {/* Report Section */}
        <div className="bg-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">销售报表</h2>

        {/* Report Type Buttons */}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              className={`px-4 py-2 rounded w-[25%] sm:w-auto text-sm sm:text-base ${
                reportType === 'monthly' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              onClick={() => setReportType('monthly')}
            >
              月报表
            </button>

            <button
              className={`px-4 py-2 rounded w-[25%] sm:w-auto text-sm sm:text-base ${
                reportType === 'seasonal' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              onClick={() => setReportType('seasonal')}
            >
              季报表
            </button>

            <button
              className={`px-4 py-2 rounded w-[25%] sm:w-auto text-sm sm:text-base ${
                reportType === 'yearly' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              onClick={() => setReportType('yearly')}
            >
              年报表
            </button>

            <button
              className="hidden bg-green-600 px-4 py-2 rounded w-[25%] sm:w-auto text-sm sm:text-base mt-2 sm:mt-0 sm:ml-auto"
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
            <button className="bg-blue-600 px-4 py-2 rounded" onClick={() => generateReport(reportType, reportValue)}>生成报表</button>
          </div>

          {/* Report table */}
        <div id="report-container" className="space-y-8">
          {Object.entries(
            reportData.reduce((acc, r) => {
              const product = products.find(p => p.model_number.toLowerCase() === r.product_name.toLowerCase());
              const manufacturer = product?.manufacturer || "未知厂商";
              if (!acc[manufacturer]) acc[manufacturer] = [];
              acc[manufacturer].push(r);
              return acc;
            }, {})
          ).map(([manufacturer, data]) => {
            const pageSizeVar = 10;
            const currentPageVar = 1;
            const startIndexVar = (currentPageVar - 1) * pageSizeVar;
            const paginatedDataVar = data.slice(startIndexVar, startIndexVar + pageSizeVar);

            return (
              <div key={manufacturer} className="mb-8">
                <h2 className="text-base sm:text-lg font-bold mb-2">{manufacturer}</h2>

                {/* 表格外层加横向滚动 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border border-zinc-700 text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="px-1 py-1">序列</th>
                        <th className="px-1 py-1">名称</th>
                        <th className="px-1 py-1">型号</th>
                        <th className="px-1 py-1">电压</th>
                        <th className="px-1 py-1">售卖数量</th>
                        <th className="px-1 py-1">购买公司</th>
                        <th className="px-1 py-1">销售额/元</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDataVar.map((r, i) => (
                        <tr key={i} className="border-b border-zinc-700">
                          <td className="px-1 py-1">{i + 1}</td>
                          <td className="px-1 py-1">{r.product_type}</td>
                          <td className="px-1 py-1">{r.product_name}</td>
                          <td className="px-1 py-1">{r.voltage}</td>
                          <td className="px-1 py-1">{r.quantity}</td>
                          <td className="px-1 py-1">{r.company_sold_to}</td>
                          <td className="px-1 py-1">{r.sales}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-zinc-700 font-bold">
                        <td colSpan={4} className="px-1 py-1">合计</td>
                        <td className="px-1 py-1">{data.reduce((sum, r) => sum + r.quantity, 0)}</td>
                        <td></td>
                        <td className="px-1 py-1">{data.reduce((sum, r) => sum + r.sales, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 分页按钮 */}
                {Math.ceil(data.length / pageSizeVar) > 1 && (
                  <div className="mt-2 flex justify-center gap-2 flex-wrap text-xs sm:text-sm">
                    <button
                      disabled={currentPageVar === 1}
                      onClick={() => currentPageVar--}
                      className="px-2 py-1 border rounded disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span>{currentPageVar} / {Math.ceil(data.length / pageSizeVar)}</span>
                    <button
                      disabled={currentPageVar === Math.ceil(data.length / pageSizeVar)}
                      onClick={() => currentPageVar++}
                      className="px-2 py-1 border rounded disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        </div>

        {/* Best Seller Chart */}
        <div className="bg-zinc-800 rounded-xl p-4 mt-6">
          <h2 className="text-lg font-semibold mb-2">前五最畅销产品</h2>
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
          <h2 className="text-lg font-semibold mb-2 text-white">前五购买最多的公司</h2>
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
