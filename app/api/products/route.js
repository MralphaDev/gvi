// app/api/products/route.js
import { getConnection } from "../../lib/db";
import mysql from "mysql2/promise";

export async function GET(req) {
  try {
    const connection = await getConnection();
    
    const url = new URL(req.url);
    let search = url.searchParams.get("search");
    let query = `
      SELECT 
        id, name, category, src, price, serial_number, type, manufacturer,
        form_factor, nominal_size, connection, connection_type, construction,
        kv_value, switching_function, control, material, sealing, voltage,
        voltage_tolerance, power_consumption, duty_cycle, protection_class,
        medium, medium_temperature, ambient_temperature, max_pressure,
        installation_position, current_inventory
      FROM product_inventory
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
      INSERT INTO product_inventory 
        (name, category, src, price, serial_number, type, manufacturer,
        form_factor, nominal_size, connection, connection_type, construction,
        kv_value, switching_function, control, material, sealing, voltage,
        voltage_tolerance, power_consumption, duty_cycle, protection_class,
        medium, medium_temperature, ambient_temperature, max_pressure,
        installation_position, current_inventory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      safeValue(data.name),
      safeValue(data.category),
      safeValue(data.src),
      safeValue(data.price),
      safeValue(data.serial_number),
      safeValue(data.type),
      safeValue(data.manufacturer),
      safeValue(data.form_factor),
      safeValue(data.nominal_size),
      safeValue(data.connection),
      safeValue(data.connection_type),
      safeValue(data.construction),
      safeValue(data.kv_value),
      safeValue(data.switching_function),
      safeValue(data.control),
      safeValue(data.material),
      safeValue(data.sealing),
      safeValue(data.voltage),
      safeValue(data.voltage_tolerance),
      safeValue(data.power_consumption),
      safeValue(data.duty_cycle),
      safeValue(data.protection_class),
      safeValue(data.medium),
      safeValue(data.medium_temperature),
      safeValue(data.ambient_temperature),
      safeValue(data.max_pressure),
      safeValue(data.installation_position),
      safeValue(data.current_inventory ?? 0)
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
    const id = data.id; // <- 从 body 里取
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const connection = await getConnection();

    const query = `
      UPDATE product_inventory
      SET name=?, category=?, current_inventory=?
      WHERE id=?
    `;

    const values = [data.name, data.category, data.current_inventory, id];

    await connection.execute(query, values);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
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

