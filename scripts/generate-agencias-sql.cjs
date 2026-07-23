const fs = require("fs");
const path = require("path");

const jsonPath = path.resolve(__dirname, "..", "data", "agencias_venezuela.json");
const agencies = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

let sql = "DELETE FROM agencias_envio;\n\n";
for (const a of agencies) {
  const empresa = (a.empresa || "").replace(/'/g, "''");
  const estado = (a.estado || "").replace(/'/g, "''");
  const ciudad = (a.ciudad || "").replace(/'/g, "''");
  const agencia = (a.agencia || "").replace(/'/g, "''");
  const direccion = (a.direccion || "").replace(/'/g, "''");
  const telefono1 = (a.telefono_1 || "").replace(/'/g, "''");
  const telefono2 = (a.telefono_2 || "").replace(/'/g, "''");
  const whatsapp = (a.whatsapp || "").replace(/'/g, "''");
  const email = (a.email || "").replace(/'/g, "''");
  const horario = (a.horario || "").replace(/'/g, "''");
  const latitud = (a.latitud || "").replace(/'/g, "''");
  const longitud = (a.longitud || "").replace(/'/g, "''");
  const urlFuente = (a.url_fuente || "").replace(/'/g, "''");

  sql += `INSERT INTO agencias_envio (empresa, estado, ciudad, agencia, direccion, telefono1, telefono2, whatsapp, email, horario, latitud, longitud, "urlFuente", activa, "updatedAt") VALUES ('${empresa}', '${estado}', '${ciudad}', '${agencia}', '${direccion}', '${telefono1}', '${telefono2}', '${whatsapp}', '${email}', '${horario}', '${latitud}', '${longitud}', '${urlFuente}', true, NOW());\n`;
}

fs.writeFileSync(path.resolve(__dirname, "..", "seed-agencias.sql"), sql);
console.log(`✅ SQL generado: ${agencies.length} INSERTs en seed-agencias.sql`);