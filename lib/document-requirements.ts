import {
    getRule,
    isRuleEnabled,
    RegistrationRule,
} from "@/lib/rules";

export interface DocumentMetadataField {
    key: string;
    label: string;
    type: "text" | "date";
    placeholder?: string;
}

export interface RequiredDocument {
    key: string;
    label: string;
    description: string;
    metadataFields: DocumentMetadataField[];
}

const companyNameField: DocumentMetadataField = {
    key: "companyName",
    label: "Company Name on Document",
    type: "text",
    placeholder: "ABC Technologies Pvt Ltd",
};

const issueDateField: DocumentMetadataField = {
    key: "issueDate",
    label: "Issue Date",
    type: "date",
};

const expiryDateField: DocumentMetadataField = {
    key: "expiryDate",
    label: "Expiry Date",
    type: "date",
};

const commonDocuments: RequiredDocument[] = [
    {
        key: "gst-certificate",
        label: "GST Certificate",
        description: "Current tax registration certificate.",
        metadataFields: [
            {
                key: "gstNumber",
                label: "GST Number",
                type: "text",
                placeholder: "27ABCDE1234F1Z5",
            },
            companyNameField,
            issueDateField,
            expiryDateField,
        ],
    },
    {
        key: "pan-card",
        label: "PAN Card",
        description: "Company or business PAN document.",
        metadataFields: [
            {
                key: "panNumber",
                label: "PAN Number",
                type: "text",
                placeholder: "ABCDE1234F",
            },
            companyNameField,
        ],
    },
    {
        key: "company-registration",
        label: "Company Registration",
        description: "Certificate of incorporation or registration.",
        metadataFields: [
            {
                key: "registrationNumber",
                label: "Registration Number",
                type: "text",
            },
            companyNameField,
            issueDateField,
            expiryDateField,
        ],
    },
    {
        key: "bank-document",
        label: "Bank Document",
        description: "Cancelled cheque or recent bank confirmation.",
        metadataFields: [
            {
                key: "accountHolderName",
                label: "Account Holder Name",
                type: "text",
                placeholder: "ABC Technologies Pvt Ltd",
            },
            {
                key: "bankName",
                label: "Bank Name",
                type: "text",
                placeholder: "Example Bank",
            },
            {
                key: "accountNumber",
                label: "Account Number",
                type: "text",
            },
        ],
    },
];

const certificationFields: DocumentMetadataField[] = [
    {
        key: "certificateNumber",
        label: "Certificate Number",
        type: "text",
    },
    companyNameField,
    issueDateField,
    expiryDateField,
];

const insuranceDocument: RequiredDocument = {
    key: "insurance-certificate",
    label: "Insurance Certificate",
    description: "Current business or liability insurance.",
    metadataFields: [
        {
            key: "policyNumber",
            label: "Policy Number",
            type: "text",
        },
        companyNameField,
        issueDateField,
        expiryDateField,
    ],
};

const isoDocument: RequiredDocument = {
    key: "iso-certificate",
    label: "ISO 27001 Certificate",
    description: "Information security certification for IT suppliers.",
    metadataFields: certificationFields,
};

const safetyDocument: RequiredDocument = {
    key: "safety-certificate",
    label: "Safety Certificate",
    description: "Required workplace or construction safety certification.",
    metadataFields: certificationFields,
};

const financialDocuments: RequiredDocument[] = [
    {
        key: "balance-sheet",
        label: "Balance Sheet",
        description: "Most recent balance sheet for high-value purchases.",
        metadataFields: [
            companyNameField,
            {
                key: "financialYear",
                label: "Financial Year",
                type: "text",
                placeholder: "2025-2026",
            },
        ],
    },
    {
        key: "income-statement",
        label: "Income Statement",
        description: "Most recent income statement for high-value purchases.",
        metadataFields: [
            companyNameField,
            {
                key: "financialYear",
                label: "Financial Year",
                type: "text",
                placeholder: "2025-2026",
            },
        ],
    },
];

const documentsByCategory: Record<
    string,
    RequiredDocument[]
> = {
    IT: [
        ...commonDocuments,
    ],
    Manufacturing: [
        ...commonDocuments,
    ],
    Construction: [
        ...commonDocuments,
    ],
    Logistics: [
        ...commonDocuments,
        {
            key: "transport-license",
            label: "Transport License",
            description: "Applicable transport or carrier operating license.",
            metadataFields: certificationFields,
        },
    ],
    "Professional Services": [
        ...commonDocuments,
        {
            key: "professional-certification",
            label: "Professional Certification",
            description: "Certification relevant to the services offered.",
            metadataFields: certificationFields,
        },
    ],
};

export function getRequiredDocuments(
    supplierCategory: string,
    rules: RegistrationRule[] = [],
    purchaseValue = 0
) {
    const categoryDocuments =
        documentsByCategory[supplierCategory] || commonDocuments;
    const categoryRuleDocuments: RequiredDocument[] = [];

    if (
        supplierCategory === "IT" &&
        isRuleEnabled(rules, "it-iso-certificate")
    ) {
        categoryRuleDocuments.push(isoDocument);
    }

    if (
        supplierCategory === "Construction" &&
        isRuleEnabled(
            rules,
            "construction-safety-certificate"
        )
    ) {
        categoryRuleDocuments.push(safetyDocument);
    }

    if (
        ["Manufacturing", "Construction", "Logistics"].includes(
            supplierCategory
        ) &&
        isRuleEnabled(rules, "supplier-insurance")
    ) {
        categoryRuleDocuments.push(insuranceDocument);
    }
    const highValueRule = getRule(
        rules,
        "high-purchase-financial-documents"
    );
    const requiresFinancialDocuments =
        isRuleEnabled(
            rules,
            "high-purchase-financial-documents"
        ) &&
        purchaseValue > (highValueRule?.threshold || 5000000);

    const requiredDocuments = [
        ...categoryDocuments,
        ...categoryRuleDocuments,
    ];

    return requiresFinancialDocuments
        ? [...requiredDocuments, ...financialDocuments]
        : requiredDocuments;
}
