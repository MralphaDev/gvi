// app/api/products/route.js
import { getConnection } from "../../lib/db";
import { NextResponse } from 'next/server';
import mysql from "mysql2/promise";

export async function GET(req) {
  try {
    const connection = await getConnection();
    
    const url = new URL(req.url);
    let search = url.searchParams.get("search");
    let query = `
      SELECT 
        id, name, category, src, price, model_number, manufacturer,
         connection, max_pressure, current_inventory, inner_diameter, temperature_range,voltage
      FROM product_inventory
    `;

    const params = [];
    if (search && search.trim() !== "") {
      query += " WHERE model_number LIKE ?";
      params.push(`%${search}%`); //防止sql注入
    }

    query += " ORDER BY id ASC";

    // 执行 SQL 查询：query 是 SQL 模板，params 用来替换其中的 ?，
    // 返回结果是 [rows, fields]，这里只解构拿到查询数据 rows
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

// app/api/products/route.js


export async function POST(request) {
  try {
    const connection = await getConnection();
    const body = await request.json();

    const { id, ...data } = body;

    // 处理对象字段，转换成带单位的字符串
    if (data.voltage && typeof data.voltage === 'object') {
      data.voltage = `${data.voltage.value}${data.voltage.unit}`;
    }

    if (data.max_pressure && typeof data.max_pressure === 'object') {
      data.max_pressure = `${data.max_pressure.min}bar-${data.max_pressure.max}bar`;
    }

    if (data.temperature_range && typeof data.temperature_range === 'object') {
      data.temperature_range = `${data.temperature_range.min}℃-${data.temperature_range.max}℃`;
    }

    const fields = [];
    const values = [];
    const placeholders = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        fields.push(key);
        values.push(value); // 现在都是字符串或数字
        placeholders.push('?');
      }
    }

    if (fields.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'No data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const query = `
      INSERT INTO product_inventory 
      (${fields.join(', ')}) 
      VALUES (${placeholders.join(', ')})
    `;

    const [result] = await connection.execute(query, values);

    return new NextResponse(
      JSON.stringify({ id: result.insertId, message: 'Product added successfully' }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('POST /api/products error:', error);

    return new NextResponse(
      JSON.stringify({ error: error.message || '错误，请重试' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}



export async function PUT(request) {
  try {
    const connection = await getConnection();
    const body = await request.json();

    const { id, ...data } = body;

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing product id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 把对象字段转字符串
    if (data.voltage && typeof data.voltage === 'object') {
      data.voltage = `${data.voltage.value}${data.voltage.unit}`;
    }
    if (data.max_pressure && typeof data.max_pressure === 'object') {
      data.max_pressure = `${data.max_pressure.min}bar-${data.max_pressure.max}bar`;
    }
    if (data.temperature_range && typeof data.temperature_range === 'object') {
      data.temperature_range = `${data.temperature_range.min}℃-${data.temperature_range.max}℃`;
    }

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) { 
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No data provided for update' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    values.push(id);

    const query = `
      UPDATE product_inventory
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    const [result] = await connection.execute(query, values);

    return new NextResponse(
      JSON.stringify({ message: 'Product updated successfully', affectedRows: result.affectedRows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PUT /api/products error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500 }
    );
  }
}






export async function DELETE(req) {
  try {
    const data = await req.json();
    if (!data.id) return new Response(JSON.stringify({ error: "ID required" }), { status: 400 });

    const connection = await getConnection();
    const [result] = await connection.execute("DELETE FROM product_inventory WHERE id = ?", [data.id]);

    if (result.affectedRows === 0) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Delete failed" }), { status: 500 });
  }
}

