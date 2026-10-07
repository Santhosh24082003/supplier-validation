"use client";

import {
    ChangeEvent,
    useEffect,
    useState,
} from "react";

import { useParams, useRouter } from "next/navigation";

import { getRegistrations } from "@/lib/storage";
import { getRequiredDocuments } from "@/lib/document-requirements";
import { getRegistrationRules } from "@/lib/rules";
import type { RegistrationRule } from "@/lib/rules";

interface Registration {
    id: string;
    name: string;
    supplierCategory: string;
}

interface StoredDocument {
    key: string;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
    uploadedAt: string;
    metadata: Record<string, string>;
}

interface SavedSupplierRegistration {
    basicInformation?: Record<string, string>;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function getDocumentsKey(registrationId: string) {
    return `supplier-documents-${registrationId}`;
}

function formatFileSize(fileSize: number) {
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ValidationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [registration, setRegistration] =
        useState<Registration | null>(null);
    const [documents, setDocuments] =
        useState<StoredDocument[]>([]);
    const [rules, setRules] =
        useState<RegistrationRule[]>([]);
    const [purchaseValue, setPurchaseValue] =
        useState(0);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
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
            const savedSupplierRegistration =
                JSON.parse(savedSupplierData) as SavedSupplierRegistration;

            setPurchaseValue(
                Number(
                    savedSupplierRegistration.basicInformation
                        ?.expectedPurchaseValue || 0
                )
            );
        }

        const savedDocuments = localStorage.getItem(
            getDocumentsKey(id)
        );

        if (savedDocuments) {
            setDocuments(JSON.parse(savedDocuments));
        }

        setLoading(false);
    }, [id]);

    const requiredDocuments = registration
        ? getRequiredDocuments(
            registration.supplierCategory,
            rules,
            purchaseValue
        )
        : [];

    function saveDocuments(
        nextDocuments: StoredDocument[]
    ) {
        setDocuments(nextDocuments);
        localStorage.setItem(
            getDocumentsKey(id),
            JSON.stringify(nextDocuments)
        );
        setSaved(false);
    }

    function updateDocumentMetadata(
        documentKey: string,
        fieldKey: string,
        value: string
    ) {
        saveDocuments(
            documents.map((document) =>
                document.key === documentKey
                    ? {
                        ...document,
                        metadata: {
                            ...(document.metadata || {}),
                            [fieldKey]: value,
                        },
                    }
                    : document
            )
        );
    }

    function handleFileChange(
        document: ReturnType<
            typeof getRequiredDocuments
        >[number],
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setError("");

        if (file.size > MAX_FILE_SIZE) {
            setError(
                `${document.label} must be 2 MB or smaller.`
            );
            event.target.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setError(
                    `Unable to read ${document.label}.`
                );
                return;
            }

            const storedDocument: StoredDocument = {
                key: document.key,
                label: document.label,
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
                fileSize: file.size,
                dataUrl: reader.result,
                uploadedAt: new Date().toISOString(),
                metadata:
                    documents.find(
                        (item) => item.key === document.key
                    )?.metadata || {},
            };

            saveDocuments([
                ...documents.filter(
                    (item) => item.key !== document.key
                ),
                storedDocument,
            ]);
        };

        reader.onerror = () => {
            setError(
                `Unable to read ${document.label}.`
            );
        };

        reader.readAsDataURL(file);
    }

    function removeDocument(documentKey: string) {
        saveDocuments(
            documents.filter(
                (document) => document.key !== documentKey
            )
        );
    }

    function handleSubmit() {
        const missingDocuments = requiredDocuments.filter(
            (requiredDocument) =>
                !documents.some(
                    (document) =>
                        document.key === requiredDocument.key
                )
        );

        const missingMetadata = requiredDocuments.flatMap(
            (requiredDocument) => {
                const uploadedDocument = documents.find(
                    (document) =>
                        document.key === requiredDocument.key
                );

                return requiredDocument.metadataFields
                    .filter(
                        (field) =>
                            !uploadedDocument?.metadata?.[
                                field.key
                            ]?.trim()
                    )
                    .map(
                        (field) =>
                            `${requiredDocument.label}: ${field.label}`
                    );
            }
        );

        if (missingDocuments.length > 0) {
            setError(
                `Upload all required documents before continuing. Missing: ${missingDocuments
                    .map((document) => document.label)
                    .join(", ")}.`
            );
            return;
        }

        if (missingMetadata.length > 0) {
            setError(
                `Complete all document information before continuing. Missing: ${missingMetadata.join(", ")}.`
            );
            return;
        }

        setError("");
        setSaved(true);
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb]">
                <p className="text-slate-600">
                    Loading documents...
                </p>
            </main>
        );
    }

    if (!registration) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">
                        Registration not found
                    </h1>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f6f8fb] px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-4xl">
                <button
                    type="button"
                    onClick={() => router.push(`/supplier/register/${id}`)}
                    className="mb-6 text-sm text-slate-500 hover:text-slate-900"
                >
                    Back to registration
                </button>

                <div className="mb-8">
                    <p className="text-sm font-semibold text-blue-700">
                        {registration.supplierCategory} Supplier
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900">
                        Upload required documents
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Upload the documents required for your supplier category.
                        Each file must be 2 MB or smaller.
                    </p>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="font-semibold text-blue-950">
                            Required for {registration.supplierCategory}
                        </p>
                        <p className="mt-1 text-sm text-blue-800">
                            {requiredDocuments.length} documents are required for this category.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {requiredDocuments.map((document) => {
                            const uploadedDocument = documents.find(
                                (item) => item.key === document.key
                            );

                            return (
                                <div
                                    key={document.key}
                                    className="rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h2 className="font-semibold text-slate-900">
                                                {document.label}
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {document.description}
                                            </p>
                                            {uploadedDocument && (
                                                <p className="mt-2 text-xs font-medium text-emerald-700">
                                                    Uploaded: {uploadedDocument.fileName} ({formatFileSize(uploadedDocument.fileSize)})
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center gap-3">
                                            <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                                                {uploadedDocument ? "Replace file" : "Choose file"}
                                                <input
                                                    type="file"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                    onChange={(event) =>
                                                        handleFileChange(
                                                            document,
                                                            event
                                                        )
                                                    }
                                                    className="sr-only"
                                                />
                                            </label>

                                            {uploadedDocument && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeDocument(
                                                            document.key
                                                        )
                                                    }
                                                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {uploadedDocument && (
                                        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                                            {document.metadataFields.map(
                                                (field) => (
                                                    <div
                                                        key={field.key}
                                                    >
                                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                                            {field.label}
                                                        </label>

                                                        <input
                                                            type={field.type}
                                                            value={
                                                                uploadedDocument
                                                                    .metadata?.[
                                                                field.key
                                                                ] || ""
                                                            }
                                                            onChange={(event) =>
                                                                updateDocumentMetadata(
                                                                    document.key,
                                                                    field.key,
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder={
                                                                field.placeholder
                                                            }
                                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                                        />
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {saved && (
                        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                            All required documents are saved
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="rounded-xl bg-indigo-600 px-7 py-3 font-semibold text-white hover:bg-indigo-700"
                        >
                            Save documents
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}