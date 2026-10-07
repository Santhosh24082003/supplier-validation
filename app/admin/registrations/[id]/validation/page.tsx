"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getRegistrations } from "@/lib/storage";
import { getRequiredDocuments } from "@/lib/document-requirements";
import {
    getRegistrationRules,
    getRule,
    isRuleEnabled,
} from "@/lib/rules";
import type { RegistrationRule } from "@/lib/rules";

interface Registration {
    id: string;
    name: string;
    supplierCategory: string;
    requiredFields: string[];
}

interface DynamicField {
    id: string;
    label: string;
}

interface SavedSupplierRegistration {
    email?: string;
    companyName?: string;
    basicInformation?: Record<string, string>;
    values?: Record<string, string>;
}

interface StoredDocument {
    key: string;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
    uploadedAt: string;
    metadata?: Record<string, string>;
}

type CheckStatus =
    | "Passed"
    | "Review required"
    | "Failed"
    | "Not applicable";

interface DocumentResult {
    key: string;
    label: string;
    document: StoredDocument | undefined;
    metadataComplete: boolean;
    expiryDateRequired: boolean;
    expired: boolean;
    expiryDateMissing: boolean;
    companyMatches: boolean | null;
    status: CheckStatus;
}

function getDocumentsKey(registrationId: string) {
    return `supplier-documents-${registrationId}`;
}

function normalize(value: string) {
    return value
        .normalize("NFKC")
        .toUpperCase()
        .replace(/&/g, " AND ")
        .replace(/[^A-Z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function formatFileSize(fileSize: number) {
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
}

function getDocumentCompanyName(
    document: StoredDocument | undefined
) {
    return (
        document?.metadata?.companyName ||
        document?.metadata?.accountHolderName ||
        ""
    );
}

function Check({
    label,
    passed,
}: {
    label: string;
    passed: boolean;
}) {
    return (
        <p className={passed ? "text-emerald-700" : "text-red-700"}>
            {passed ? "✓" : "✗"} {label}
        </p>
    );
}

function StatusBadge({ status }: { status: CheckStatus }) {
    const className =
        status === "Passed"
            ? "bg-emerald-50 text-emerald-700"
            : status === "Failed"
                ? "bg-red-50 text-red-700"
                : status === "Not applicable"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-amber-50 text-amber-700";

    return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
            {status}
        </span>
    );
}

export default function ValidationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [registration, setRegistration] =
        useState<Registration | null>(null);
    const [supplierRegistration, setSupplierRegistration] =
        useState<SavedSupplierRegistration | null>(null);
    const [documents, setDocuments] =
        useState<StoredDocument[]>([]);
    const [dynamicFields, setDynamicFields] =
        useState<DynamicField[]>([]);
    const [rules, setRules] =
        useState<RegistrationRule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentRegistration = getRegistrations().find(
            (item) => item.id === id
        );

        if (!currentRegistration) {
            setLoading(false);
            return;
        }

        setRegistration(currentRegistration);
        setRules(getRegistrationRules(id));

        const savedSupplierData = localStorage.getItem(
            `supplier-registration-${id}`
        );

        if (savedSupplierData) {
            setSupplierRegistration(
                JSON.parse(savedSupplierData)
            );
        }

        const savedDocuments = localStorage.getItem(
            getDocumentsKey(id)
        );

        if (savedDocuments) {
            setDocuments(JSON.parse(savedDocuments));
        }

        const savedFields = localStorage.getItem(
            `registration-fields-${id}`
        );

        if (savedFields) {
            setDynamicFields(JSON.parse(savedFields));
        }

        setLoading(false);
    }, [id]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-600">
                    Loading validation result...
                </p>
            </main>
        );
    }

    if (!registration) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">
                        Registration not found
                    </h1>
                </div>
            </main>
        );
    }

    const requiredDocuments = getRequiredDocuments(
        registration.supplierCategory,
        rules,
        Number(
            supplierRegistration?.basicInformation
                ?.expectedPurchaseValue || 0
        )
    );
    const expectedCompanyName =
        supplierRegistration?.basicInformation?.companyName ||
        supplierRegistration?.companyName ||
        "";
    const today = new Date().toISOString().slice(0, 10);
    const categoryDocumentsRuleEnabled = isRuleEnabled(
        rules,
        "category-documents"
    );
    const expiryRuleEnabled = isRuleEnabled(
        rules,
        "document-expiry"
    );
    const companyMatchRuleEnabled = isRuleEnabled(
        rules,
        "company-name-match"
    );
    const documentResults: DocumentResult[] =
        requiredDocuments.map((requiredDocument) => {
            const document = documents.find(
                (item) => item.key === requiredDocument.key
            );
            const metadataComplete =
                Boolean(document) &&
                requiredDocument.metadataFields.every(
                    (field) =>
                        Boolean(
                            document?.metadata?.[
                                field.key
                            ]?.trim()
                        )
                );
            const expiryDate =
                document?.metadata?.expiryDate;
            const requiresExpiryDate =
                requiredDocument.metadataFields.some(
                    (field) => field.key === "expiryDate"
                );
            const expiryDateMissing =
                requiresExpiryDate && !expiryDate;
            const expired = Boolean(
                expiryDate && expiryDate < today
            );
            const documentCompanyName =
                getDocumentCompanyName(document);
            const companyMatches = expectedCompanyName
                ? Boolean(documentCompanyName) &&
                normalize(documentCompanyName) ===
                normalize(expectedCompanyName)
                : null;

            let status: CheckStatus = "Passed";

            if (
                (categoryDocumentsRuleEnabled && !document) ||
                (Boolean(document) && !metadataComplete) ||
                (expiryRuleEnabled &&
                    (expiryDateMissing || expired))
            ) {
                status = "Failed";
            } else if (
                companyMatchRuleEnabled &&
                companyMatches === false
            ) {
                status = "Review required";
            }

            return {
                key: requiredDocument.key,
                label: requiredDocument.label,
                document,
                metadataComplete,
                expiryDateRequired:
                    requiresExpiryDate && expiryRuleEnabled,
                expired,
                expiryDateMissing,
                companyMatches,
                status,
            };
        });

    const hasFailedDocument = documentResults.some(
        (result) => result.status === "Failed"
    );
    const hasReviewDocument = documentResults.some(
        (result) => result.status === "Review required"
    );
    const documentNames = documentResults
        .map((result) => getDocumentCompanyName(result.document))
        .filter(Boolean);
    const namesMatch =
        documentNames.length > 0 &&
        documentNames.length === documentResults.length &&
        Boolean(expectedCompanyName) &&
        documentNames.every(
            (name) => normalize(name) === normalize(documentNames[0])
        );
    const mandatoryFieldsPassed = registration.requiredFields.every(
        (fieldKey) =>
            Boolean(
                supplierRegistration?.basicInformation?.[
                    fieldKey
                ]?.trim()
            )
    );
    const expiryRulePassed = documentResults.every(
        (result) =>
            !result.expiryDateRequired ||
            (!result.expiryDateMissing && !result.expired)
    );
    const highValueRule = getRule(
        rules,
        "high-purchase-financial-documents"
    );
    const purchaseValue = Number(
        supplierRegistration?.basicInformation
            ?.expectedPurchaseValue || 0
    );
    const highValueRequiresFinancialDocuments =
        isRuleEnabled(
            rules,
            "high-purchase-financial-documents"
        ) &&
        purchaseValue > (highValueRule?.threshold || 5000000);
    const financialDocumentsPassed =
        !highValueRequiresFinancialDocuments ||
        ["balance-sheet", "income-statement"].every(
            (key) =>
                documents.some(
                    (document) => document.key === key
                )
        );
    const hasCompleteDocument = (documentKey: string) => {
        const result = documentResults.find(
            (item) => item.key === documentKey
        );

        return Boolean(result?.document) &&
            Boolean(result?.metadataComplete);
    };
    const ruleResults = rules
        .filter(
            (rule) =>
                rule.enabled && rule.id !== "gst-format"
        )
        .map((rule) => {
            let passed = true;
            let applicable = true;
            let status: CheckStatus = "Passed";

            if (rule.id === "mandatory-fields") {
                passed = mandatoryFieldsPassed;
            }

            if (rule.id === "category-documents") {
                passed = documentResults.every(
                    (result) =>
                        Boolean(result.document) &&
                        result.metadataComplete
                );
            }

            if (rule.id === "document-expiry") {
                passed = expiryRulePassed;
            }

            if (rule.id === "company-name-match") {
                passed = namesMatch;
            }

            if (rule.id === "it-iso-certificate") {
                applicable =
                    registration.supplierCategory === "IT";
                passed =
                    hasCompleteDocument("iso-certificate");
            }

            if (rule.id === "construction-safety-certificate") {
                applicable =
                    registration.supplierCategory === "Construction";
                passed =
                    hasCompleteDocument("safety-certificate");
            }

            if (rule.id === "supplier-insurance") {
                applicable = [
                    "Manufacturing",
                    "Construction",
                    "Logistics",
                ].includes(registration.supplierCategory);
                passed =
                    hasCompleteDocument("insurance-certificate");
            }

            if (rule.id === "high-purchase-financial-documents") {
                applicable = highValueRequiresFinancialDocuments;
                passed = financialDocumentsPassed;
            }

            if (!applicable) {
                status = "Not applicable";
            } else {
                status = passed ? "Passed" : "Failed";
            }

            return {
                ...rule,
                status,
            };
        });

    const hasFailedRule = ruleResults.some(
        (rule) => rule.status === "Failed"
    );
    const overallStatus: CheckStatus =
        hasFailedDocument || hasFailedRule
            ? "Failed"
            : hasReviewDocument
                ? "Review required"
                : "Passed";

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-8">
            <div className="mx-auto max-w-6xl">
                <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="mb-6 text-sm text-slate-500 hover:text-slate-900"
                >
                    Back to Admin Dashboard
                </button>

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-indigo-600">
                            Supplier Validation
                        </p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">
                            {registration.name}
                        </h1>
                        <p className="mt-2 text-slate-500">
                            {registration.supplierCategory} supplier validation result
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500">
                            Overall result
                        </span>
                        <StatusBadge status={overallStatus} />
                    </div>
                </div>

                {!supplierRegistration && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                        No supplier registration has been submitted yet.
                    </div>
                )}

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Supplier Information
                    </h2>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Email
                            </p>
                            <p className="mt-1 text-slate-900">
                                {supplierRegistration?.email || "Not provided"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Category
                            </p>
                            <p className="mt-1 text-slate-900">
                                {registration.supplierCategory}
                            </p>
                        </div>

                        {Object.entries(
                            supplierRegistration?.basicInformation || {}
                        ).map(([key, value]) => (
                            <div key={key}>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {key}
                                </p>
                                <p className="mt-1 wrap-break-word text-slate-900">
                                    {value || "Not provided"}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Dynamic Supplier Fields
                    </h2>

                    {dynamicFields.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">
                            No dynamic fields were configured.
                        </p>
                    ) : (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {dynamicFields.map((field) => (
                                <div key={field.id}>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {field.label}
                                    </p>
                                    <p className="mt-1 wrap-break-word text-slate-900">
                                        {supplierRegistration?.values?.[
                                            field.id
                                        ] || "Not provided"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                Document Validation
                            </h2>
                            {/* <p className="mt-1 text-sm text-slate-500">
                                Manual metadata checks performed by the frontend.
                            </p> */}
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            {documentResults.length} required documents
                        </p>
                    </div>

                    <div className="mt-5 space-y-4">
                        {documentResults.map((result) => (
                            <article
                                key={result.key}
                                className="rounded-xl border border-slate-200 p-5"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {result.label}
                                        </h3>
                                        {result.document ? (
                                            <a
                                                href={result.document.dataUrl}
                                                download={result.document.fileName}
                                                className="mt-1 inline-block text-sm text-indigo-600 hover:text-indigo-800"
                                            >
                                                {result.document.fileName} ({formatFileSize(result.document.fileSize)})
                                            </a>
                                        ) : (
                                            <p className="mt-1 text-sm text-red-600">
                                                No document uploaded
                                            </p>
                                        )}
                                    </div>
                                    <StatusBadge status={result.status} />
                                </div>

                                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                                    <Check
                                        label="Document uploaded"
                                        passed={Boolean(result.document)}
                                    />
                                    <Check
                                        label="Required information complete"
                                        passed={result.metadataComplete}
                                    />
                                    {result.expiryDateRequired && (
                                        <Check
                                            label={
                                                result.expiryDateMissing
                                                    ? "Expiry date missing"
                                                    : result.expired
                                                        ? "Document expired"
                                                        : "Document not expired"
                                            }
                                            passed={
                                                !result.expiryDateMissing &&
                                                !result.expired
                                            }
                                        />
                                    )}
                                    <Check
                                        label={
                                            result.companyMatches === false
                                                ? "Company name mismatch"
                                                : result.companyMatches === true
                                                    ? "Company name matches"
                                                    : "Company name missing"
                                        }
                                        passed={result.companyMatches === true}
                                    />
                                </div>

                                {result.document && (
                                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                                        {Object.entries(
                                            result.document.metadata || {}
                                        ).map(([key, value]) => (
                                            <div key={key}>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    {key}
                                                </p>
                                                <p className="mt-1 wrap-break-word text-sm text-slate-900">
                                                    {value || "Not provided"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                Business Rule Results
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Rules configured for this registration.
                            </p>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            {ruleResults.length} enabled
                        </p>
                    </div>

                    <div className="mt-5 space-y-3">
                        {ruleResults.map((rule) => (
                            <div
                                key={rule.id}
                                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        {rule.label}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {rule.description}
                                    </p>
                                    {rule.id ===
                                        "high-purchase-financial-documents" && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                Threshold: INR {rule.threshold?.toLocaleString("en-IN")}
                                            </p>
                                        )}
                                </div>
                                <StatusBadge status={rule.status} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Data Matching
                    </h2>
                    {/* <p className="mt-2 text-sm text-slate-500">
                        Company names from GST, bank, and other documents are compared after normalizing case and spaces.
                    </p> */}

                    <div className="mt-5 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="font-medium text-slate-900">
                                    Registration company name
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {expectedCompanyName || "Not provided"}
                                </p>
                            </div>
                            <span className={namesMatch ? "text-emerald-700" : "text-red-700"}>
                                {namesMatch
                                    ? "✓ Match"
                                    : "✗ Missing or mismatched data"}
                            </span>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                            {documentResults.map((result) => (
                                <div
                                    key={result.key}
                                    className="flex justify-between gap-4 text-sm"
                                >
                                    <span className="text-slate-500">
                                        {result.label}
                                    </span>
                                    <span className="text-right text-slate-900">
                                        {getDocumentCompanyName(result.document) || "Not provided"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <p className="mt-6 text-xs leading-5 text-slate-500">
                    Frontend-only validation checks the uploaded file, manually entered metadata, expiry dates, and name consistency. It does not prove that a file is authentic or that its contents match the selected document type.
                </p>
            </div>
        </main>
    );
}