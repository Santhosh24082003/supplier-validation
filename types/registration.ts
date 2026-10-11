export interface Registration {
    id: string;

    name: string;

    registrationType:
        | "open"
        | "closed"
        | "hybrid";

    startDate: string;

    endDate: string;

    registrationLink: string;

    supplierCategory: string;

    requiredFields: string[];

    approvalStatus?:
        | "pending"
        | "approved"
        | "rejected";

    createdAt: string;
}

export interface SupplierInvitation {
    id: string;

    registrationId: string;

    email: string;

    accessCode: string;

    status: "invited" | "used";

    createdAt: string;
}

export interface SupplierAccessRequest {
    id: string;

    registrationId: string;

    email: string;

    companyName: string;

    status:
        | "pending"
        | "approved"
        | "rejected";

    createdAt: string;
}

export interface DynamicFileRequirement {
    id: string;
    label: string;
    description: string;
    required: boolean;
    allowedExtensions?: string[];
    collectCompanyName?: boolean;
    collectDocNumber?: boolean;
    collectIssueDate?: boolean;
    collectExpiryDate?: boolean;
}

export interface SupplyingItem {
    id: string;
    name: string;
    uom: string;
    price: string | number;
}
