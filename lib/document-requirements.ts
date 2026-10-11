import {
    getRule,
    isRuleEnabled,
    RegistrationRule,
} from "@/lib/rules";
import { DynamicFileRequirement } from "@/types/registration";

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
    isDynamic?: boolean;
    required?: boolean;
    allowedExtensions?: string[];
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

export function dynamicFileToRequiredDocument(
    file: DynamicFileRequirement
): RequiredDocument {
    const metadataFields: DocumentMetadataField[] = [];

    if (file.collectCompanyName) {
        metadataFields.push({
            key: "companyName",
            label: "Company Name on Document",
            type: "text",
            placeholder: "ABC Technologies Pvt Ltd",
        });
    }

    if (file.collectDocNumber) {
        metadataFields.push({
            key: "documentNumber",
            label: "Document / Certificate Number",
            type: "text",
            placeholder: "e.g. DOC-12345",
        });
    }

    if (file.collectIssueDate) {
        metadataFields.push({
            key: "issueDate",
            label: "Issue Date",
            type: "date",
        });
    }

    if (file.collectExpiryDate) {
        metadataFields.push({
            key: "expiryDate",
            label: "Expiry Date",
            type: "date",
        });
    }

    return {
        key: `dynamic-${file.id}`,
        label: file.label,
        description: file.description || "Upload the requested document.",
        metadataFields,
        isDynamic: true,
        required: file.required !== false,
        allowedExtensions: file.allowedExtensions,
    };
}

export const categoryUOMMap: Record<string, string[]> = {
    IT: [
        "Pieces (Pcs)",
        "Hours (Hrs)",
        "Days (Days)",
        "Months (Months)",
        "Licenses (Lic)",
        "User Seats (Seats)",
        "Subscriptions (Subs)",
        "Milestones (Milestone)",
        "Units (Units)",
    ],
    Manufacturing: [
        "Pieces (Pcs)",
        "Units (Units)",
        "Kilograms (Kg)",
        "Grams (g)",
        "Metric Tonnes (MT)",
        "Liters (Ltr)",
        "Meters (Mtr)",
        "Boxes (Box)",
        "Sets (Sets)",
        "Batches (Batch)",
    ],
    Construction: [
        "Pieces (Pcs)",
        "Square Feet (Sq Ft)",
        "Square Meters (Sq M)",
        "Cubic Meters (Cu M)",
        "Metric Tonnes (MT)",
        "Kilograms (Kg)",
        "Running Meters (Rmt)",
        "Bags (Bags)",
        "Hours (Hrs)",
        "Days (Days)",
        "Loads / Trips (Loads)",
    ],
    Logistics: [
        "Pieces (Pcs)",
        "Trips / Shipments (Trips)",
        "Kilometers (Km)",
        "Kilograms (Kg)",
        "Metric Tonnes (MT)",
        "Pallets (Pallet)",
        "Boxes (Box)",
        "Cubic Meters (CBM)",
        "Containers (TEU)",
        "Hours (Hrs)",
    ],
    "Professional Services": [
        "Pieces (Pcs)",
        "Hours (Hrs)",
        "Days (Days)",
        "Months (Months)",
        "Mandays (Mandays)",
        "Retainer (Month)",
        "Milestones (Milestone)",
        "Deliverables (Deliverable)",
        "Visits (Visits)",
        "Sessions (Sessions)",
    ],
};

export function getUnitsOfMeasurement(supplierCategory?: string): string[] {
    if (supplierCategory && categoryUOMMap[supplierCategory]) {
        return categoryUOMMap[supplierCategory];
    }
    return [
        "Pieces (Pcs)",
        "Units (Units)",
        "Hours (Hrs)",
        "Days (Days)",
        "Months (Months)",
        "Kilograms (Kg)",
        "Metric Tonnes (MT)",
        "Liters (Ltr)",
        "Meters (Mtr)",
        "Boxes (Box)",
        "Sets (Sets)",
    ];
}

