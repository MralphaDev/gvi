"use client";
import React from "react";
import { useEffect, useState } from "react";
import { FiMenu } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function Tier2() {
  const [loadingMenu, setLoadingMenu] = useState(false);
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
  const [logForm, setLogForm] = useState({ id: "", product_id: "", action: "IN", quantity: "",company_sold_to: "" ,voltage:"" , coil_id: null, mode: ""});
  const [searchProduct, setSearchProduct] = useState("");
  const [searchCoil, setSearchCoil] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCoilSearching, setIsCoilSearching] = useState(false);
  const [searchDate, setSearchDate] = useState("");

//const [page, setPage] = React.useState(1);
const [selectedCompany, setSelectedCompany] = React.useState(""); // 默认显示全部

const [imagePreview, setImagePreview] = useState(null);

 const [menuOpen, setMenuOpen] = useState(false);

const [onProductEdit, setOnProductEdit] = useState(false);
const [onCoilEdit, setOnCoilEdit] = useState(false);
const [onLogEdit, setOnLogEdit] = useState(false);

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
  }, []);

useEffect(() => {
  if (!menuOpen) return;

  const loadData = async () => {
    setLoadingMenu(true);
    await Promise.all([fetchProducts(), fetchCoil()]);
    setLoadingMenu(false);
  };

  loadData();
}, [menuOpen]);

const fetchCoil = async () => {
  const res = await fetch(`/api/coil${searchProduct ? `?search=${searchProduct}` : ""}`);
  //console.log("fetch coil response:", res);
  const data = await res.json();
  setCoil(data);
  return data;
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


const fetchProducts = async () => {
  const res = await fetch(`/api/products${searchProduct ? `?search=${searchProduct}` : ""}`);
  const data = await res.json();
  setProducts(data);
  return data;
};

const fetchInventoryLog = async (date) => {
  const url = date ? `/api/inventory_log?date=${date}` : `/api/inventory_log`;
  const res = await fetch(url);
  const data = await res.json();
  setInventoryLog(data);
  return data;
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
    setLogForm({ id: "", product_id: "", action: "IN", quantity: 0, voltage: "", company_sold_to: "", coil_id: null, mode: ""});

    // 更新日志
    fetchInventoryLog();
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
    <div className="min-h-screen p-10 bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">科延自动化库存管理系统</h1>
      {/* Curtain Menu ICON DIV*/}
      <div className="fixed top-4 right-4 z-[9999]">
        <button
          onClick={() => {
            setMenuOpen(!menuOpen);
            setSearchProduct("");
            setIsSearching(false);
            setSearchCoil("");
            setIsCoilSearching(false);
          }}
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
            {loadingMenu ? (
            <div className="flex items-center justify-center h-full text-white">
              加载中...
            </div>
              ) : (<div className="h-full grid grid-cols-2 gap-6 p-8  ">
              <div className="bg-zinc-900 rounded-lg overflow-y-auto">
                {/* Product Inventory */}
                <div className="bg-zinc-800 rounded-xl p-4 overflow-auto flex flex-col gap-4">
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
                              <span className="w-20">内径: {p.inner_diameter ?? "-"}mm</span>
                              <span className="w-24">温度范围: {p.temperature_range ?? "-"}</span>
                              <span className="w-28">最大压力: {p.max_pressure ?? "-"}</span>
                              <span className="w-24">连接: {p.connection ?? "-"}</span>
                            </div>

                            <div className="flex gap-2 ml-auto">
                              
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
                    <button className={`p-2 rounded ${coilForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleCoilSubmit}>
                      {coilForm.id ? "更新线圈" : "添加线圈"}
                    </button>
                  </div>
                </div>
              </div>
            </div>)}
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
                  筛选
                </button>
                <button
                  onClick={() => { setSearchDate(""); fetchInventoryLog(""); }}
                  className="bg-gray-600 px-4 py-2 rounded"
                >
                  取消筛选
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

              return (
                <li key={entry.id} className="border-b border-zinc-700 pb-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span>
                      在 {formatDate(entry.action_date)} {preposition} {entry.company_sold_to || "未填写"}，{actionMap[entry.action]} {entry.quantity}个 {product.model_number}（{product.name}，{modeMap[entry.mode] || ""}）
                    </span>
                    <div className="flex gap-2">
                     
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

            <button className={`p-2 rounded ${logForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleLogSubmit}>
              {logForm.id ? "更新账目" : "添加账目"}
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}
