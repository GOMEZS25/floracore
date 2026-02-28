const { PrismaClient } = require('@prisma/client');

const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  await prisma.role.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Administrador' },
      { name: 'Bodega' },
      { name: 'Ventas' },
      { name: 'Compras' }
    ]

  });
  console.log('Roles creados');

  await prisma.user.upsert({
    where: {
      email: "gomezse97@gmail.com"
    },
    update: {},
    create: {
      full_name: 'Elkin Santiago Gomez Ramirez',
      email: "gomezse97@gmail.com",
      password_hash: await bcrypt.hash('Temp1234', 10),
      is_active: true,
      created_at: new Date(),
      role_id: 1

    }
  });

  console.log('Usuario creado');
}


main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

