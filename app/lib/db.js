import mysql from "mysql2/promise";

export async function getConnection() {
  return mysql.createConnection({
    host: "srv2067.hstgr.io",
    user: "u550705974_goet",
    password: "Visonwzx1234@",
    database: "u550705974_goetvalves",
  });
}
