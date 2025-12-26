// app/api/coil/route.js
import { getConnection } from "../../lib/db";
import mysql from "mysql2/promise";

export async function GET(req) {
  try {
    const connection = await getConnection();
    
    const url = new URL(req.url);
    let search = url.searchParams.get("search");
    let query = `
      SELECT id, name, voltage, inventory,manufacturer
      FROM coil
    `;

    const params = [];
    if (search && search.trim() !== "") {
      query += " WHERE name LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY id ASC";

    const [rows] = await connection.execute(query, params);

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Database fetch failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const connection = await getConnection();

    const safeValue = (v) => v !== undefined ? v : null;

    const query = `
      INSERT INTO coil (name, voltage, inventory,manufacturer)
      VALUES (?, ?, ?,?)
    `;

    const values = [
      safeValue(data.name),
      safeValue(data.voltage),
      safeValue(data.inventory ?? 0),
      safeValue(data.manufacturer)
    ];

    const [result] = await connection.execute(query, values);

    return new Response(JSON.stringify({ id: result.insertId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Insert failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const id = data.id;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const connection = await getConnection(); // 假设你有这个函数

    // 添加 manufacturer 到更新字段
    const query = `
      UPDATE coil
      SET name = ?, voltage = ?, inventory = ?, manufacturer = ?
      WHERE id = ?
    `;

    // 注意顺序要和上面 ? 严格对应
    const values = [data.name, data.voltage, data.inventory, data.manufacturer, id];

    await connection.execute(query, values);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Coil PUT error:", error);
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req) {
  try {
    const data = await req.json();
    if (!data.id) return new Response(JSON.stringify({ error: "ID required" }), { status: 400 });

    const connection = await getConnection();
    const [result] = await connection.execute("DELETE FROM coil WHERE id = ?", [data.id]);

    if (result.affectedRows === 0) {
      return new Response(JSON.stringify({ error: "Coil not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Delete failed" }), { status: 500 });
  }
}
