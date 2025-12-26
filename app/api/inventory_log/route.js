// app/api/products/route.js
import { getConnection } from "../../lib/db"; // 注意路径
import mysql from "mysql2/promise";

export async function GET(req) {
  try {
    const connection = await getConnection(); // 使用现有连接

    const url = new URL(req.url);
    const date = url.searchParams.get("date"); // YYYY-MM-DD

    let query = `
      SELECT 
        l.id, 
        l.product_id, 
        p.name AS product_name, 
        p.model_number AS model_number,
        l.action, 
        l.quantity, 
        l.action_date, 
        l.remark,
        l.company_sold_to,
        l.coil_id
      FROM inventory_log l
      LEFT JOIN product_inventory p ON l.product_id = p.id
    `;
    const params = [];

    if (date) {
      query += " WHERE DATE(l.action_date) = ?";
      params.push(date);
    }

    query += " ORDER BY l.action_date DESC";

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
    const connection = await getConnection();
    const body = await req.json();
    const { product_id, action, quantity, voltage, company_sold_to, coil_id, mode } = body;

    // 1. 插入 inventory_log
    const [result] = await connection.execute(
      `INSERT INTO inventory_log (product_id, action, quantity, action_date, voltage, company_sold_to, coil_id)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
      [product_id ?? null, action, quantity, voltage ?? null, company_sold_to ?? null, coil_id ?? null]
    );

    const delta = action === "IN" ? quantity : -quantity;

    // 2. 根据 mode 决定操作
    if (mode === "product") {
      // 只更新 product_inventory
      if (product_id) {
        await connection.execute(
          `UPDATE product_inventory
           SET current_inventory = GREATEST(current_inventory + ?, 0)
           WHERE id = ?`,
          [delta, product_id]
        );
      }
    } else if (mode === "coil") {
      // 只更新 coil
      if (coil_id) {
        await connection.execute(
          `UPDATE coil
           SET inventory = GREATEST(inventory + ?, 0)
           WHERE id = ?`,
          [delta, coil_id]
        );
      }
    } else if (mode === "both") {
      // 更新 product_inventory 和 coil
      if (product_id) {
        await connection.execute(
          `UPDATE product_inventory
           SET current_inventory = GREATEST(current_inventory + ?, 0)
           WHERE id = ?`,
          [delta, product_id]
        );
      }
      if (coil_id) {
        await connection.execute(
          `UPDATE coil
           SET inventory = GREATEST(inventory + ?, 0)
           WHERE id = ?`,
          [delta, coil_id]
        );
      }
    }

    // 3. 返回新插入的 log
    const [rows] = await connection.execute(
      `SELECT il.id, il.product_id, il.action, il.quantity, il.action_date,
              p.name as product_name, p.current_inventory
       FROM inventory_log il
       LEFT JOIN product_inventory p ON p.id = il.product_id
       WHERE il.id = ?`,
      [result.insertId]
    );

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to add log" }), { status: 500 });
  }
}



export async function PUT(req) {
  try {
    const data = await req.json();
    if (!data.id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const connection = await getConnection();
    const query = `
      UPDATE inventory_log
      SET product_id=?, action=?, quantity=?, company_sold_to=?, voltage=?, coil_id=?
      WHERE id=?
    `;
    const values = [
      data.product_id,
      data.action,
      data.quantity,
      data.company_sold_to ?? null,
      data.voltage ?? null,
      data.coil_id ?? null,
      data.id
    ];

    await connection.execute(query, values);

    await connection.execute(query, values);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Update failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req) {
  try {
    const data = await req.json();
    if (!data.id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const connection = await getConnection();
    await connection.execute("DELETE FROM inventory_log WHERE id=?", [data.id]);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Delete failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}