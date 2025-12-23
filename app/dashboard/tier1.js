"use client";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";

export default function Tier1() {
  const [products, setProducts] = useState([]);
  const [inventoryLog, setInventoryLog] = useState([]);
  const [productForm, setProductForm] = useState({ id: "", name: "", category: "", current_inventory: 0 });
  const [logForm, setLogForm] = useState({ id: "", product_id: "", action: "IN", quantity: 0 });
  const [searchProduct, setSearchProduct] = useState("");
  const [searchDate, setSearchDate] = useState("");

// state
const [reportType, setReportType] = useState("monthly");
const [reportData, setReportData] = useState([]);
const [reportValue, setReportValue] = useState('');      // 选中的年份/月/季度

  // fetch products & log
  useEffect(() => {
    fetchProducts();
    fetchInventoryLog();
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
    if(!map[log.product_id]) map[log.product_id] = { product_name: product.name, quantity: 0, sales: 0, price: Number(product.price || 0) };
    map[log.product_id].quantity += log.quantity;
    map[log.product_id].sales += log.quantity * Number(product.price || 0);
  });

  setReportData(Object.values(map).sort((a,b)=>b.quantity - a.quantity));
}

const bestSellers = reportData
  .sort((a, b) => (b.quantity ) - (a.quantity))
  .slice(0, 5)
  .map(r => ({ name: r.product_name, quantity: r.quantity }));

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
    setProductForm({ id: "", name: "", category: "", current_inventory: 0 });
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
  const method = logForm.id ? "PUT" : "POST";
  const res = await fetch("/api/inventory_log", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logForm),
  });
  if (res.ok) {
    setLogForm({ id: "", product_id: "", action: "IN", quantity: 0 });
    fetchInventoryLog();
    fetchProducts(); // 同步更新库存
  }
};

const handleLogDelete = async () => {
  if (!logForm.id) return alert("Missing log id");
  if (!confirm("Delete this log?")) return;
  await fetch("/api/inventory_log", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: logForm.id }),
  });
  setLogForm({ id: "", product_id: "", action: "IN", quantity: 0 });
  fetchInventoryLog();
  fetchProducts();
};

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")} ${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getFullYear()).slice(-2)}`;
  };

  return (
    <div className="min-h-screen p-10 bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">Tier 1 Dashboard</h1>
      <div className="grid grid-cols-2 gap-6 ">

        {/* Product Inventory */}
        <div className="bg-zinc-800 rounded-xl p-4 overflow-auto  flex flex-col gap-4">
          <h2 className="text-lg font-semibold mb-2">Product Inventory</h2>
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
                setSearchProduct("");        // 清空输入框
                fetch(`/api/products`)       // 直接 fetch 全部，不用 fetchProducts()
                  .then(res => res.json())
                  .then(data => setProducts(data));
              }} 
              className="bg-gray-600 px-4 py-2 rounded"
            >
              Deselect
            </button>

        </div>

          <ul className="space-y-2 overflow-auto max-h-100">
            {products.map((p) => (
              <li key={p.id} className="border-b border-zinc-700 pb-1 flex justify-between items-center">
                <img src={p.src} alt={p.name} className="w-20 h-20 object-cover rounded" />
                <span><strong>{p.name}</strong> — Inventory: {p.current_inventory}</span>
                <div className="flex gap-2">
                  <button className="bg-yellow-600 px-2 rounded" onClick={() => setProductForm(p)}>Edit</button>
                  <button className="bg-red-600 px-2 rounded" onClick={() => handleProductDelete(p.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 mt-2">
            <input name="name" value={productForm.name} onChange={(e) => handleChange(e, "product")} placeholder="Name" className="p-2 rounded bg-zinc-900 text-white"/>
            <input name="category" value={productForm.category} onChange={(e) => handleChange(e, "product")} placeholder="Category" className="p-2 rounded bg-zinc-900 text-white"/>
            <input type="number" name="current_inventory" value={productForm.current_inventory} onChange={(e) => handleChange(e, "product")} placeholder="Inventory" className="p-2 rounded bg-zinc-900 text-white"/>
            <button className={`p-2 rounded ${productForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleProductSubmit}>
              {productForm.id ? "Update Product" : "Add Product"}
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

          <ul className="space-y-2 overflow-auto max-h-100">
            {inventoryLog.map((entry) => (
              <li key={entry.id} className="border-b border-zinc-700 pb-1 flex justify-between items-center">
                <span>
                  <strong>{entry.product_name}</strong> — {entry.action} {entry.quantity} — {formatDate(entry.action_date)} - Company: {entry.company_sold_to || "N/A"}
                </span>
                <div className="flex gap-2">
                  <button className="bg-yellow-600 px-2 rounded" onClick={() => setLogForm(entry)}>Edit</button>
                  <button className="bg-red-600 px-2 rounded" onClick={() => handleLogDelete(entry.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>



          {/* 添加/编辑 log */}
          <div className="flex flex-col gap-2 mt-2">
            <select name="product_id" value={logForm.product_id} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="">Select Product</option>
              {products.map((p)=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select name="action" value={logForm.action} onChange={(e)=>handleChange(e,"log")} className="p-2 rounded bg-zinc-900 text-white">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <input type="number" name="quantity" value={logForm.quantity} onChange={(e)=>handleChange(e,"log")} placeholder="Quantity" className="p-2 rounded bg-zinc-900 text-white"/>
            <button className={`p-2 rounded ${logForm.id ? "bg-blue-600" : "bg-green-600"}`} onClick={handleLogSubmit}>
              {logForm.id ? "Update Log" : "Add Log"}
            </button>
          </div>
        </div>

{/* Report Section */}
<div className="bg-zinc-800 rounded-xl p-4 mt-6">
  <h2 className="text-lg font-semibold mb-2">Sales Report</h2>

  {/* Report Type Buttons */}
  <div className="flex gap-2 mb-2">
    <button className={`px-4 py-2 rounded ${reportType==='monthly'?'bg-blue-600':'bg-gray-600'}`} onClick={()=>setReportType('monthly')}>Monthly</button>
    <button className={`px-4 py-2 rounded ${reportType==='seasonal'?'bg-blue-600':'bg-gray-600'}`} onClick={()=>setReportType('seasonal')}>Seasonal</button>
    <button className={`px-4 py-2 rounded ${reportType==='yearly'?'bg-blue-600':'bg-gray-600'}`} onClick={()=>setReportType('yearly')}>Yearly</button>
    <button className="bg-green-600 px-4 py-2 rounded" onClick={exportPDF}>Download PDF</button>
  </div>

  {/* Report Value Selector */}
  <div className="flex gap-2 mb-4">
    {reportType === 'yearly' && (
      <select value={reportValue} onChange={e => setReportValue(e.target.value)} className="p-2 rounded bg-zinc-900 text-white">
        <option value="">Select Year</option>
        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    )}
    {reportType === 'monthly' && (
      <>
        <select value={reportValue.split('-')[0] || ''} onChange={e => setReportValue(`${e.target.value}-1`)} className="p-2 rounded bg-zinc-900 text-white">
          <option value="">Year</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={reportValue.split('-')[1] || ''} onChange={e => setReportValue(`${reportValue.split('-')[0]}-${e.target.value}`)} className="p-2 rounded bg-zinc-900 text-white">
          <option value="">Month</option>
          {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </>
    )}
    {reportType === 'seasonal' && (
      <>
        <select value={reportValue.split('-')[0] || ''} onChange={e => setReportValue(`${e.target.value}-1`)} className="p-2 rounded bg-zinc-900 text-white">
          <option value="">Year</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={reportValue.split('-')[1] || ''} onChange={e => setReportValue(`${reportValue.split('-')[0]}-${e.target.value}`)} className="p-2 rounded bg-zinc-900 text-white">
          <option value="">Season</option>
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
        <th className="px-2 py-1">Product</th>
        <th className="px-2 py-1">Quantity Sold</th>
        <th className="px-2 py-1">Sales/Euro</th>
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
    //console.log("inventory entry log:", log);
    if (log.action !== "OUT") return;

    const company = log.company_sold_to || "Unknown Company";

    if (!map[company]) {
      map[company] = { totalQuantity: 0, products: {} };
    }

    map[company].totalQuantity += log.quantity;

    const productName = log.product_name || "Unknown Product";
    if (!map[company].products[productName]) {
      map[company].products[productName] = 0;
    }
    map[company].products[productName] += log.quantity;
  });

  return Object.entries(map)
    .map(([company, data]) => ({
      company,
      totalQuantity: data.totalQuantity,
      topProducts: Object.entries(data.products)
        .map(([name, quantity]) => ({ name, quantity }))
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
  content={({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // <-- 这里拿整条数据
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
                  <li key={i}>{p.name} ({p.quantity})</li>
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
