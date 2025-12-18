const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fields = [
    { name: 'invoice_number', label: 'Invoice Number', dataType: 'text', required: true, searchable: true },
    { name: 'vendor_name', label: 'Vendor Name', dataType: 'text', required: true, searchable: true },
    { name: 'invoice_date', label: 'Invoice Date', dataType: 'date', required: true, searchable: false },
    { name: 'amount', label: 'Total Amount', dataType: 'number', required: true, searchable: false },
    { name: 'currency', label: 'Currency', dataType: 'enum', required: true, searchable: false, enumValues: JSON.stringify(['USD', 'EUR', 'GBP']) },
  ];

  for (const field of fields) {
    await prisma.metadataField.upsert({
      where: { name: field.name },
      update: {},
      create: field,
    });
  }
  console.log('Seeded metadata fields');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
