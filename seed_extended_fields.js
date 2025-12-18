const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const metadataDefs = [
  // ─────────────────────
  // Core business metadata
  // ─────────────────────
  { name: 'invoice_number', label: 'Invoice Number', dataType: 'text', required: true, searchable: true },
  { name: 'invoice_amount', label: 'Amount', dataType: 'number', required: true, searchable: false },
  { name: 'currency', label: 'Currency', dataType: 'enum', enumValues: '["GHS", "USD", "EUR"]', required: true, searchable: true },
  { name: 'vendor_name', label: 'Vendor Name', dataType: 'text', required: true, searchable: true },
  { name: 'vendor_tax_id', label: 'Vendor Tax ID', dataType: 'text', required: false, searchable: true },

  // ─────────────────────
  // Date & financial context
  // ─────────────────────
  { name: 'issue_date', label: 'Issue Date', dataType: 'date', required: true, searchable: true },
  { name: 'effective_date', label: 'Effective Date', dataType: 'date', required: true, searchable: true },
  { name: 'due_date', label: 'Payment Due Date', dataType: 'date', required: false, searchable: true },
  { name: 'tax_amount', label: 'Tax Amount', dataType: 'number', required: false, searchable: false },

  // ─────────────────────
  // Classification & linkage
  // ─────────────────────
  { name: 'department', label: 'Department', dataType: 'enum', enumValues: '["Finance", "Procurement", "Operations"]', required: true, searchable: true },
  { name: 'cost_center', label: 'Cost Center', dataType: 'text', required: false, searchable: true },
  { name: 'purchase_order_number', label: 'PO Number', dataType: 'text', required: false, searchable: true },
  { name: 'related_contract_id', label: 'Related Contract', dataType: 'text', required: false, searchable: false },

  // ─────────────────────
  // Record management (ERM-specific)
  // ─────────────────────
  { name: 'record_owner', label: 'Record Owner', dataType: 'user', required: true, searchable: false },
  { name: 'record_status', label: 'Record Status', dataType: 'enum', enumValues: '["Draft", "Active", "Paid", "Archived"]', required: true, searchable: true },
  { name: 'retention_category', label: 'Retention Category', dataType: 'enum', enumValues: '["Financial-7Y", "Tax-10Y"]', required: true, searchable: false },
  { name: 'review_date', label: 'Review Date', dataType: 'date', required: false, searchable: false },

  // ─────────────────────
  // Security & compliance
  // ─────────────────────
  { name: 'confidentiality', label: 'Confidentiality Level', dataType: 'enum', enumValues: '["Low", "Medium", "High"]', required: false, searchable: true },
  { name: 'legal_hold', label: 'Legal Hold', dataType: 'boolean', required: false, searchable: false },
  { name: 'compliance_tags', label: 'Compliance Tags', dataType: 'multiselect', enumValues: '["VAT", "GRA", "Audit"]', required: false, searchable: true },

  // ─────────────────────
  // Search & usability
  // ─────────────────────
  { name: 'keywords', label: 'Keywords', dataType: 'text', required: false, searchable: true },
  { name: 'notes', label: 'Notes / Remarks', dataType: 'text', required: false, searchable: false },
];

  for (const field of metadataDefs) {
    await prisma.metadataField.upsert({
      where: { name: field.name },
      update: field,
      create: field,
    });
  }
  console.log('Seeded extended metadata fields');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
