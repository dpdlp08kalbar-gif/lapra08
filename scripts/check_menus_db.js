const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
(async () => {
  try {
    const menus = await prisma.menuItem.findMany({ select: { id: true, key: true, label: true, order: true, isActive: true, parentId: true } })
    console.log('=== All Menu Items ===')
    menus.forEach(m => console.log(`- key=${m.key} | label="${m.label}" | order=${m.order} | active=${m.isActive} | parent=${m.parentId || '-'}`))
    console.log('Total:', menus.length)
  } catch(e) { console.error(e) }
  finally { await prisma.$disconnect() }
})();
