import { getConnection } from "../../lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { account, password } = await req.json();
  const conn = await getConnection();

  const [rows] = await conn.execute(
    "SELECT role, password FROM admins WHERE account=?",
    [account]
  );

  if (!rows.length || rows[0].password !== password) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }

  return NextResponse.json({ role: rows[0].role });
}
