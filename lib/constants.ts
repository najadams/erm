// 1. Core Operating Sectors (Standard set for Ghana)
export const SECTORS = [
    'Agriculture, Forestry & Fishing',
    'Mining & Quarrying',
    'Oil & Gas / Energy',
    'Manufacturing',
    'Construction & Real Estate',
    'Trade (Wholesale & Retail)',
    'Transport & Logistics',
    'Information & Communication Technology (ICT)',
    'Financial Services & Insurance',
    'Professional & Business Services',
    'Health & Pharmaceuticals',
    'Education',
    'Hospitality & Tourism',
    'Arts, Entertainment & Media',
    'Utilities (Water, Electricity, Waste)',
    'Public / Social Enterprises & NGOs',
    'Other Services'
];

// 2. Sub-sectors (Secondary Classification)
export const SUB_SECTORS: Record<string, string[]> = {
    'Information & Communication Technology (ICT)': [
        'Software development', 'Fintech', 'Telecom services', 'Data centers', 'IT consulting', 'Hardware sales'
    ],
    'Agriculture, Forestry & Fishing': [
        'Crop farming', 'Livestock', 'Agro-processing', 'Export trading', 'Input supply'
    ],
    'Manufacturing': [
        'Food & beverage', 'Textiles', 'Chemicals', 'Plastics', 'Building materials', 'Pharmaceuticals'
    ],
    'Financial Services & Insurance': [
        'Banking', 'Insurance', 'Capital Markets', 'Microfinance', 'Mobile Money'
    ],
    'Energy': [
        'Renewable', 'Oil & Gas Upstream', 'Oil & Gas Downstream', 'Power Generation'
    ]
    // Add others as needed, these are the examples provided
};

// 3. Strategic Tags (GIPC-specific)
export const STRATEGIC_TAGS = [
    // Investment Profile
    'Foreign-owned', 'Joint venture', 'Local SME', 'Large enterprise',
    // Economic Priority
    'Export-oriented', 'Import substitution', 'Job-intensive', 'Strategic national interest', 'Green / renewable', 'Digital economy',
    // Geography
    'Free Zones', 'Industrial park', 'Border region', 'Rural-based', 'Urban',
    // Risk / Compliance
    'Regulated industry', 'Environmental impact', 'High capital requirement', 'Sensitive sector'
];

export const INVESTOR_TYPES = [
    { value: 'FOREIGN', label: 'Foreign Investor' },
    { value: 'LOCAL', label: 'Local Investor' },
    { value: 'JOINT_VENTURE', label: 'Joint Venture' },
    { value: 'GOVERNMENT', label: 'Government/State' }
];
