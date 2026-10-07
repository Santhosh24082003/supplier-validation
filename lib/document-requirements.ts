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

const documentsByCategory: Record<
    string,
    RequiredDocument[]
> = {
    IT: [
        ...commonDocuments,
        {
            key: "iso-certificate",
            label: "ISO Certificate",
            description: "Relevant information security or quality certification.",
            metadataFields: certificationFields,
        },
    ],
    Manufacturing: [
        ...commonDocuments,
        insuranceDocument,
    ],
    Construction: [
        ...commonDocuments,
        insuranceDocument,
        {
            key: "safety-certificate",
            label: "Safety Certificate",
            description: "Required workplace or construction safety certification.",
            metadataFields: certificationFields,
        },
    ],
    Logistics: [
        ...commonDocuments,
        insuranceDocument,
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
    supplierCategory: string
) {
    return documentsByCategory[supplierCategory] || commonDocuments;
}
