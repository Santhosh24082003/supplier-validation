export type RuleId =
    | "mandatory-fields"
    | "gst-format"
    | "category-documents"
    | "document-expiry"
    | "company-name-match"
    | "it-iso-certificate"
    | "construction-safety-certificate"
    | "supplier-insurance"
    | "high-purchase-financial-documents";

export interface RegistrationRule {
    id: RuleId;
    label: string;
    description: string;
    enabled: boolean;
    threshold?: number;
}

const RULES_KEY_PREFIX = "registration-rules-";

export const defaultRegistrationRules: RegistrationRule[] = [
    {
        id: "mandatory-fields",
        label: "Mandatory fields",
        description: "All administrator-selected supplier fields must be completed.",
        enabled: true,
    },
    {
        id: "gst-format",
        label: "GST format",
        description: "The GST number must match the 15-character GSTIN format.",
        enabled: true,
    },
    {
        id: "category-documents",
        label: "Category documents",
        description: "Documents required by the supplier category must be uploaded.",
        enabled: true,
    },
    {
        id: "document-expiry",
        label: "Document expiry",
        description: "Required expiry dates must be present and cannot be in the past.",
        enabled: true,
    },
    {
        id: "company-name-match",
        label: "Company name matching",
        description: "Company names across registration, GST, bank, and certificates must match.",
        enabled: true,
    },
    {
        id: "it-iso-certificate",
        label: "IT ISO 27001 certificate",
        description: "IT suppliers must provide an ISO 27001 certificate.",
        enabled: true,
    },
    {
        id: "construction-safety-certificate",
        label: "Construction safety certificate",
        description: "Construction suppliers must provide a safety certificate.",
        enabled: true,
    },
    {
        id: "supplier-insurance",
        label: "Supplier insurance",
        description: "Manufacturing, Construction, and Logistics suppliers must provide insurance.",
        enabled: true,
    },
    {
        id: "high-purchase-financial-documents",
        label: "High-value financial documents",
        description: "Purchases above the threshold require a balance sheet and income statement.",
        enabled: true,
        threshold: 5000000,
    },
];

export function getRegistrationRules(
    registrationId: string
): RegistrationRule[] {
    if (typeof window === "undefined") {
        return defaultRegistrationRules;
    }

    const data = localStorage.getItem(
        `${RULES_KEY_PREFIX}${registrationId}`
    );

    if (!data) {
        return defaultRegistrationRules;
    }

    const savedRules = JSON.parse(data) as RegistrationRule[];

    return defaultRegistrationRules.map((defaultRule) =>
        savedRules.find(
            (savedRule) => savedRule.id === defaultRule.id
        ) || defaultRule
    );
}

export function saveRegistrationRules(
    registrationId: string,
    rules: RegistrationRule[]
) {
    localStorage.setItem(
        `${RULES_KEY_PREFIX}${registrationId}`,
        JSON.stringify(rules)
    );
}

export function isRuleEnabled(
    rules: RegistrationRule[],
    ruleId: RuleId
) {
    return rules.some(
        (rule) => rule.id === ruleId && rule.enabled
    );
}

export function getRule(
    rules: RegistrationRule[],
    ruleId: RuleId
) {
    return rules.find((rule) => rule.id === ruleId);
}

export function isValidGstNumber(value: string) {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        value.trim().toUpperCase()
    );
}
