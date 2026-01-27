import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data Definitions
const CATEGORIES = [
  { name: 'Company & Investment', code: 'INV', types: [
      { name: 'CERTIFICATE_OF_REGISTRATION', fields: ['certificateNumber', 'companyName', 'registrationDate', 'issuedBy', 'companyRegistrationNumber', 'expiryDate'] },
      { name: 'GIPC_CERTIFICATE', fields: ['certificateNumber', 'companyName', 'sector', 'minimumCapital', 'issueDate', 'expiryDate'] },
      { name: 'INVESTMENT_PROPOSAL', fields: ['investmentAmount', 'currency', 'sector', 'proposedLocation', 'expectedJobs', 'submissionDate'] },
      { name: 'BUSINESS_PLAN', fields: ['planningPeriodYears', 'sector', 'totalInvestment', 'preparedBy', 'submissionDate'] },
      { name: 'SHAREHOLDER_AGREEMENT', fields: ['parties', 'effectiveDate', 'durationYears', 'governingLaw'] },
      { name: 'JOINT_VENTURE_AGREEMENT', fields: ['parties', 'effectiveDate', 'durationYears', 'governingLaw'] },
      { name: 'CAPITAL_IMPORTATION_EVIDENCE', fields: ['amount', 'currency', 'bankName', 'transactionReference', 'transactionDate'] },
      { name: 'INCENTIVE_APPLICATION', fields: ['incentiveType', 'amountRequested', 'submissionDate'] },
      { name: 'INCENTIVE_APPROVAL', fields: ['decisionDate', 'decisionBy', 'reason', 'approvedAmount'] },
      { name: 'INCENTIVE_REJECTION', fields: ['decisionDate', 'decisionBy', 'reason'] },
  ]},
  { name: 'Legal & Regulatory', code: 'LEG', types: [
      { name: 'CONTRACT', fields: ['parties', 'effectiveDate', 'expiryDate', 'contractValue', 'currency'] },
      { name: 'MOU', fields: ['parties', 'effectiveDate', 'expiryDate'] },
      { name: 'COURT_DOCUMENT', fields: ['courtName', 'caseNumber', 'caseType', 'filingDate'] },
      { name: 'LEGAL_OPINION', fields: ['issuedBy', 'issueDate', 'subjectMatter'] },
      { name: 'REGULATORY_APPROVAL', fields: ['regulatorName', 'approvalType', 'decisionDate', 'referenceNumber'] },
      { name: 'REGULATORY_REJECTION', fields: ['regulatorName', 'approvalType', 'decisionDate', 'referenceNumber'] },
      { name: 'LICENSE', fields: ['licenseNumber', 'issuingAuthority', 'issueDate', 'expiryDate', 'scope'] },
      { name: 'PERMIT', fields: ['licenseNumber', 'issuingAuthority', 'issueDate', 'expiryDate'] },
      { name: 'COMPLIANCE_REPORT', fields: ['reportingPeriodStart', 'reportingPeriodEnd', 'complianceStatus'] },
  ]},
  { name: 'Financial', code: 'FIN', types: [
      { name: 'TAX_CLEARANCE_CERTIFICATE', fields: ['taxpayerName', 'tin', 'issueDate', 'expiryDate'] },
      { name: 'FINANCIAL_STATEMENT', fields: ['financialYear', 'statementType', 'audited'] },
      { name: 'BANK_CONFIRMATION', fields: ['bankName', 'accountName', 'confirmationDate'] },
      { name: 'PAYMENT_RECEIPT', fields: ['receiptNumber', 'amount', 'currency', 'paymentDate', 'payerName'] },
      { name: 'FEE_INVOICE', fields: ['invoiceNumber', 'amount', 'currency', 'issueDate', 'dueDate'] },
      { name: 'AUDIT_REPORT', fields: ['auditorName', 'auditPeriodStart', 'auditPeriodEnd', 'opinionType'] },
  ]},
  { name: 'Internal Administration', code: 'INT', types: [
      { name: 'INTERNAL_MEMO', fields: ['subject', 'issuedBy', 'issueDate', 'department'] },
      { name: 'BOARD_MINUTES', fields: ['meetingDate', 'meetingLocation', 'chairperson'] },
      { name: 'MANAGEMENT_REPORT', fields: ['reportingPeriod', 'preparedBy'] },
      { name: 'STAFF_CORRESPONDENCE', fields: ['senderName', 'recipientName', 'dateSent'] },
      { name: 'PROCUREMENT_DOCUMENT', fields: ['procurementType', 'referenceNumber', 'procurementDate'] },
      { name: 'POLICY_DOCUMENT', fields: ['subject', 'issuedBy', 'issueDate'] },
      { name: 'CIRCULAR', fields: ['subject', 'issuedBy', 'issueDate'] },
  ]},
  { name: 'Communication', code: 'COM', types: [
      { name: 'INCOMING_LETTER', fields: ['sender', 'recipient', 'dateSent', 'referenceNumber'] },
      { name: 'OUTGOING_LETTER', fields: ['sender', 'recipient', 'dateSent', 'referenceNumber'] },
      { name: 'EMAIL_CORRESPONDENCE', fields: ['fromEmail', 'toEmail', 'subject', 'dateSent'] },
      { name: 'STAKEHOLDER_SUBMISSION', fields: ['stakeholderName', 'organization', 'submissionDate'] },
      { name: 'PUBLIC_NOTICE', fields: ['noticeType', 'publicationDate', 'publishedBy'] },
  ]},
  { name: 'Technical & Identity', code: 'TEC', types: [
      { name: 'SITE_PLAN', fields: ['location', 'coordinates', 'preparedBy'] },
      { name: 'ENGINEERING_REPORT', fields: ['projectName', 'engineerName', 'reportDate'] },
      { name: 'ENVIRONMENTAL_IMPACT_ASSESSMENT', fields: ['projectName', 'consultantName', 'approvalStatus'] },
      { name: 'VALUATION_REPORT', fields: ['assetDescription', 'valuationAmount', 'valuationDate', 'valuerName'] },
      { name: 'IDENTIFICATION_DOCUMENT', fields: ['idType', 'idNumber', 'fullName', 'expiryDate'] },
      { name: 'OTHER', fields: ['customDescription'] },
  ]}
];

const FIELDS: Record<string, { label: string, type: string, required?: boolean, rules?: any, enum?: string[] }> = {
    // Strings
    certificateNumber: { label: 'Certificate Number', type: 'text', required: true },
    companyName: { label: 'Company Name', type: 'text', required: true },
    issuedBy: { label: 'Issued By', type: 'text', required: true },
    companyRegistrationNumber: { label: 'Company Reg. Number', type: 'text', required: true },
    sector: { label: 'Sector', type: 'text', required: true },
    proposedLocation: { label: 'Proposed Location', type: 'text', required: true },
    preparedBy: { label: 'Prepared By', type: 'text', required: true },
    governingLaw: { label: 'Governing Law', type: 'text', required: true },
    bankName: { label: 'Bank Name', type: 'text', required: true },
    transactionReference: { label: 'Transaction Reference', type: 'text', required: true },
    reason: { label: 'Reason', type: 'textArea', required: true },
    courtName: { label: 'Court Name', type: 'text', required: true },
    caseNumber: { label: 'Case Number', type: 'text', required: true },
    caseType: { label: 'Case Type', type: 'text', required: true },
    subjectMatter: { label: 'Subject Matter', type: 'text', required: true },
    regulatorName: { label: 'Regulator Name', type: 'text', required: true },
    approvalType: { label: 'Approval Type', type: 'text', required: true },
    referenceNumber: { label: 'Reference Number', type: 'text', required: true },
    decisionBy: { label: 'Decision By', type: 'text', required: true },
    licenseNumber: { label: 'License Number', type: 'text', required: true },
    issuingAuthority: { label: 'iIssuing Authority', type: 'text', required: true },
    scope: { label: 'Scope', type: 'textArea', required: false },
    taxpayerName: { label: 'Taxpayer Name', type: 'text', required: true },
    tin: { label: 'TIN', type: 'text', required: true },
    accountName: { label: 'Account Name', type: 'text', required: true },
    receiptNumber: { label: 'Receipt Number', type: 'text', required: true },
    payerName: { label: 'Payer Name', type: 'text', required: true },
    invoiceNumber: { label: 'Invoice Number', type: 'text', required: true },
    auditorName: { label: 'Auditor Name', type: 'text', required: true },
    subject: { label: 'Subject', type: 'text', required: true },
    department: { label: 'Department', type: 'text', required: true },
    meetingLocation: { label: 'Meeting Location', type: 'text', required: true },
    chairperson: { label: 'Chairperson', type: 'text', required: true },
    reportingPeriod: { label: 'Reporting Period', type: 'text', required: true },
    senderName: { label: 'Sender Name', type: 'text', required: true },
    recipientName: { label: 'Recipient Name', type: 'text', required: true },
    sender: { label: 'Sender', type: 'text', required: true },
    recipient: { label: 'Recipient', type: 'text', required: true },
    fromEmail: { label: 'From Email', type: 'email', required: true },
    toEmail: { label: 'To Email', type: 'email', required: true },
    stakeholderName: { label: 'Stakeholder Name', type: 'text', required: true },
    organization: { label: 'Organization', type: 'text', required: false },
    location: { label: 'Location', type: 'text', required: true },
    coordinates: { label: 'Coordinates', type: 'text', required: false },
    projectName: { label: 'Project Name', type: 'text', required: true },
    engineerName: { label: 'Engineer Name', type: 'text', required: true },
    consultantName: { label: 'Consultant Name', type: 'text', required: true },
    assetDescription: { label: 'Asset Description', type: 'textArea', required: true },
    valuerName: { label: 'Valuer Name', type: 'text', required: true },
    idNumber: { label: 'ID Number', type: 'text', required: true },
    fullName: { label: 'Full Name', type: 'text', required: true },
    customDescription: { label: 'Description', type: 'textArea', required: true },
    noticeType: { label: 'Notice Type', type: 'text', required: true },
    publishedBy: { label: 'Published By', type: 'text', required: true },

    // Numbers
    minimumCapital: { label: 'Minimum Capital', type: 'number', required: true },
    investmentAmount: { label: 'Investment Amount', type: 'number', required: true },
    expectedJobs: { label: 'Expected Jobs', type: 'number', required: false },
    planningPeriodYears: { label: 'Planning Period (Years)', type: 'number', required: true },
    totalInvestment: { label: 'Total Investment', type: 'number', required: true },
    durationYears: { label: 'Duration (Years)', type: 'number', required: false },
    amount: { label: 'Amount', type: 'number', required: true },
    amountRequested: { label: 'Amount Requested', type: 'number', required: false },
    approvedAmount: { label: 'Approved Amount', type: 'number', required: false },
    contractValue: { label: 'Contract Value', type: 'number', required: false },
    financialYear: { label: 'Financial Year', type: 'number', required: true },
    valuationAmount: { label: 'Valuation Amount', type: 'number', required: true },

    // Dates
    registrationDate: { label: 'Registration Date', type: 'date', required: true },
    expiryDate: { label: 'Expiry Date', type: 'date', required: false },
    issueDate: { label: 'Issue Date', type: 'date', required: true },
    submissionDate: { label: 'Submission Date', type: 'date', required: true },
    effectiveDate: { label: 'Effective Date', type: 'date', required: true },
    transactionDate: { label: 'Transaction Date', type: 'date', required: true },
    decisionDate: { label: 'Decision Date', type: 'date', required: true },
    filingDate: { label: 'Filing Date', type: 'date', required: true },
    reportingPeriodStart: { label: 'Period Start', type: 'date', required: true },
    reportingPeriodEnd: { label: 'Period End', type: 'date', required: true },
    confirmationDate: { label: 'Confirmation Date', type: 'date', required: true },
    paymentDate: { label: 'Payment Date', type: 'date', required: true },
    dueDate: { label: 'Due Date', type: 'date', required: false },
    auditPeriodStart: { label: 'Audit Start', type: 'date', required: true },
    auditPeriodEnd: { label: 'Audit End', type: 'date', required: true },
    meetingDate: { label: 'Meeting Date', type: 'date', required: true },
    dateSent: { label: 'Date Sent', type: 'date', required: true }, // or 'datetime'
    procurementDate: { label: 'Procurement Date', type: 'date', required: true },
    publicationDate: { label: 'Publication Date', type: 'date', required: true },
    reportDate: { label: 'Report Date', type: 'date', required: true },
    valuationDate: { label: 'Valuation Date', type: 'date', required: true },

    // Booleans
    audited: { label: 'Audited', type: 'boolean', required: true },

    // Enums / Arrays
    currency: { label: 'Currency', type: 'select', enum: ['GHS', 'USD', 'EUR', 'OTHER'], required: true },
    parties: { label: 'Parties', type: 'array', required: true }, // Simplified as text/array?
    incentiveType: { label: 'Incentive Type', type: 'select', enum: ['TAX', 'CUSTOMS', 'VAT', 'OTHER'], required: true },
    complianceStatus: { label: 'Compliance Status', type: 'select', enum: ['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL'], required: true },
    statementType: { label: 'Statement Type', type: 'select', enum: ['BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW'], required: true },
    opinionType: { label: 'Opinion', type: 'select', enum: ['CLEAN', 'QUALIFIED', 'ADVERSE', 'DISCLAIMER'], required: true },
    procurementType: { label: 'Procurement Type', type: 'select', enum: ['RFQ', 'RFP', 'TENDER', 'CONTRACT'], required: true },
    approvalStatus: { label: 'Approval Status', type: 'select', enum: ['PENDING', 'APPROVED', 'REJECTED'], required: true },
    idType: { label: 'ID Type', type: 'select', enum: ['PASSPORT', 'GHANA_CARD', 'DRIVERS_LICENSE'], required: true },
}

async function main() {
  console.log('Seeding Governance Templates...');
  
  // 1. Ensure Organization
  const org = await prisma.organization.findFirst() || await prisma.organization.create({
      data: { name: 'GIPC Application' } // Default name if not exists
  });

  // 2. Create/Update Fields
  const fieldMap: Record<string, string> = {}; // Name -> ID
  for (const [key, config] of Object.entries(FIELDS)) {
      const field = await prisma.metadataField.upsert({
          where: { name: key },
          update: { 
              label: config.label, 
              dataType: config.type, 
              required: config.required || false,
              enumValues: config.enum ? JSON.stringify(config.enum) : null 
          },
          create: { 
              name: key, 
              label: config.label, 
              dataType: config.type, 
              required: config.required || false,
              enumValues: config.enum ? JSON.stringify(config.enum) : null 
          }
      });
      fieldMap[key] = field.id;
  }

  // 3. Create Categories and Types
  for (const cat of CATEGORIES) {
      console.log(`Processing Category: ${cat.name}`);
      const category = await prisma.recordCategory.upsert({
          where: { id: cat.code }, // Assuming we can use code as specific ID or find by name? 
          // Since schema defines ID as uuid, let's find by Organization + Name if we assume uniqueness.
          // BUT schema doesn't constrain unique Name per Org.
          // Let's rely on cleaning or recreating? 
          // For now, let's look up first.
          update: {},
          create: {
              organizationId: org.id,
              name: cat.name,
              defaultVisibility: 'ORG'
          }
      });
      
      // Upsert via findFirst equivalent since no unique constraint on (org, name)
      // Actually, let's use a simpler logic: Find by Name, if not Create.
      const existingCat = await prisma.recordCategory.findFirst({ where: { organizationId: org.id, name: cat.name }});
      const realCategory = existingCat || await prisma.recordCategory.create({
          data: { organizationId: org.id, name: cat.name, defaultVisibility: 'ORG' }
      });

      for (const typeDef of cat.types) {
          // Upsert Type
          const existingType = await prisma.recordType.findFirst({ where: { categoryId: realCategory.id, name: typeDef.name }});
          let typeId = existingType?.id;

          if (!typeId) {
              const newType = await prisma.recordType.create({
                  data: {
                      categoryId: realCategory.id,
                      name: typeDef.name,
                      code: typeDef.name.substring(0, 10), // Simple code
                  }
              });
              typeId = newType.id;
          }

          // Link Fields
          // First, clear existing links to avoid duplicates or enforce exact state?
          await prisma.recordTypeMetadata.deleteMany({ where: { recordTypeId: typeId }});
          
          let displayOrder = 1;
          for (const fieldName of typeDef.fields) {
              const fieldId = fieldMap[fieldName];
              if (!fieldId) {
                  console.warn(`Warning: Field ${fieldName} not defined in FIELDS constant.`);
                  continue;
              }
              
              await prisma.recordTypeMetadata.create({
                  data: {
                      recordTypeId: typeId,
                      metadataFieldId: fieldId,
                      displayOrder: displayOrder++,
                      editable: true
                  }
              });
          }
      }
  }

  console.log('Seeding Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
