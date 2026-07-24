const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.agenciaEnvio.count({ where: { activa: true } });
  console.log("Agencias activas:", count);
  
  if (count > 0) {
    const distinct = await prisma.agenciaEnvio.findMany({
      where: { activa: true },
      select: { estado: true },
      distinct: ["estado"],
    });
    console.log("Estados:", distinct.map(e => e.estado).join(", "));
  }
}

main().catch(e => console.error("Error:", e.message)).finally(() => prisma.$disconnect());