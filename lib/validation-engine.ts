export type ValidationOutcome =
    | "Approved"
    | "Review Required"
    | "Rejected"
    | "Pending";

export type ScoringRuleStatus =
    | "Passed"
    | "Review required"
    | "Failed"
    | "Not applicable";

export interface ScoringDocumentResult {
    uploaded: boolean;
    metadataFieldCount: number;
    completedMetadataFieldCount: number;
    expired: boolean;
    expiryDateRequired: boolean;
    companyMatches: boolean | null;
}

export interface ScoringRuleResult {
    status: ScoringRuleStatus;
}

export interface ValidationScoreBreakdown {
    companyInformation: number;
    requiredDocuments: number;
    documentMetadata: number;
    dataMatching: number;
    businessRules: number;
    total: number;
    maximum: 100;
    outcome: ValidationOutcome;
    hasCriticalFailure: boolean;
}

interface CalculateValidationScoreInput {
    hasSupplierSubmission: boolean;
    requiredFieldCount: number;
    completedRequiredFieldCount: number;
    documents: ScoringDocumentResult[];
    rules: ScoringRuleResult[];
    hasReviewRequired: boolean;
}

function clampScore(score: number) {
    return Math.max(0, Math.min(100, score));
}

function roundScore(score: number) {
    return Math.round(score * 10) / 10;
}

export function calculateValidationScore({
    hasSupplierSubmission,
    requiredFieldCount,
    completedRequiredFieldCount,
    documents,
    rules,
    hasReviewRequired,
}: CalculateValidationScoreInput): ValidationScoreBreakdown {
    if (!hasSupplierSubmission) {
        return {
            companyInformation: 0,
            requiredDocuments: 0,
            documentMetadata: 0,
            dataMatching: 0,
            businessRules: 0,
            total: 0,
            maximum: 100,
            outcome: "Pending",
            hasCriticalFailure: false,
        };
    }

    const companyInformation = roundScore(
        requiredFieldCount === 0
            ? 25
            : (completedRequiredFieldCount / requiredFieldCount) * 25
    );
    const requiredDocuments = roundScore(
        documents.length === 0
            ? 0
            : (documents.filter((document) => document.uploaded).length /
                documents.length) *
            25
    );
    const documentMetadata = roundScore(
        documents.length === 0
            ? 0
            : (documents.reduce(
                (total, document) =>
                    total +
                    (document.metadataFieldCount === 0
                        ? 0
                        : document.completedMetadataFieldCount /
                        document.metadataFieldCount),
                0
            ) /
                documents.length) *
            20
    );

    const comparableDocuments = documents.filter(
        (document) => document.companyMatches !== null
    );
    const dataMatching = roundScore(
        comparableDocuments.length === 0
            ? 0
            : (comparableDocuments.filter(
                (document) => document.companyMatches === true
            ).length /
                comparableDocuments.length) *
            20
    );

    const applicableRules = rules.filter(
        (rule) => rule.status !== "Not applicable"
    );
    const businessRules = roundScore(
        applicableRules.length === 0
            ? 10
            : (applicableRules.reduce(
                (total, rule) =>
                    total +
                    (rule.status === "Passed"
                        ? 1
                        : rule.status === "Review required"
                            ? 0.5
                            : 0),
                0
            ) /
                applicableRules.length) *
            10
    );

    const total = roundScore(
        companyInformation +
        requiredDocuments +
        documentMetadata +
        dataMatching +
        businessRules
    );
    const hasCriticalFailure =
        completedRequiredFieldCount < requiredFieldCount ||
        documents.some(
            (document) =>
                !document.uploaded ||
                document.completedMetadataFieldCount <
                document.metadataFieldCount ||
                (document.expiryDateRequired && document.expired)
        ) ||
        rules.some((rule) => rule.status === "Failed");

    let outcome: ValidationOutcome = "Approved";

    if (hasCriticalFailure) {
        outcome = "Rejected";
    } else if (hasReviewRequired || total < 90) {
        outcome = "Review Required";
    }

    return {
        companyInformation,
        requiredDocuments,
        documentMetadata,
        dataMatching,
        businessRules,
        total: clampScore(total),
        maximum: 100,
        outcome,
        hasCriticalFailure,
    };
}
