"use client";

import {
    ChangeEvent,
    useEffect,
    useState,
} from "react";

import { useParams, useRouter } from "next/navigation";

import { getRegistrations } from "@/lib/storage";

interface Registration {
    id: string;
    name: string;
    supplierCategory: string;
}

interface RequiredDocument {
    key: string;
    label: string;
    description: string;
}

interface StoredDocument {
    key: string;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
    uploadedAt: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const commonDocuments: RequiredDocument[] = [
    {
        key: "gst-certificate",
        label: "GST Certificate",
        description: "Current tax registration certificate.",
    },
    {
        key: "pan-card",
        label: "PAN Card",
        description: "Company or business PAN document.",
    },
    {
        key: "company-registration",
        label: "Company Registration",
        description: "Certificate of incorporation or registration.",
    },
    {
        key: "bank-document",
        label: "Bank Document",
        description: "Cancelled cheque or recent bank confirmation.",
    },
];

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
        },
    ],
    Manufacturing: [
        ...commonDocuments,
        {
            key: "insurance-certificate",
            label: "Insurance Certificate",
            description: "Current business or product liability insurance.",
        },
    ],
    Construction: [
        ...commonDocuments,
        {
            key: "insurance-certificate",
            label: "Insurance Certificate",
            description: "Current business or contractor insurance.",
        },
        {
            key: "safety-certificate",
            label: "Safety Certificate",
            description: "Required workplace or construction safety certification.",
        },
    ],
    Logistics: [
        ...commonDocuments,
        {
            key: "insurance-certificate",
            label: "Insurance Certificate",
            description: "Current goods-in-transit or business insurance.",
        },
        {
            key: "transport-license",
            label: "Transport License",
            description: "Applicable transport or carrier operating license.",
        },
    ],
    "Professional Services": [
        ...commonDocuments,
        {
            key: "professional-certification",
            label: "Professional Certification",
            description: "Certification relevant to the services offered.",
        },
    ],
};

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

        const savedDocuments = localStorage.getItem(
            getDocumentsKey(id)
        );

        if (savedDocuments) {
            setDocuments(JSON.parse(savedDocuments));
        }

        setLoading(false);
    }, [id]);

    const requiredDocuments = registration
        ? documentsByCategory[registration.supplierCategory] || commonDocuments
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

    function handleFileChange(
        document: RequiredDocument,
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

        if (missingDocuments.length > 0) {
            setError(
                `Upload all required documents before continuing. Missing: ${missingDocuments
                    .map((document) => document.label)
                    .join(", ")}.`
            );
            return;
        }

        setError("");
        setSaved(true);
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-600">
                    Loading documents...
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

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">
            <div className="mx-auto max-w-4xl">
                <button
                    type="button"
                    onClick={() => router.push(`/supplier/register/${id}`)}
                    className="mb-6 text-sm text-slate-500 hover:text-slate-900"
                >
                    Back to registration
                </button>

                <div className="mb-8">
                    <p className="text-sm font-semibold text-indigo-600">
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

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                        <p className="font-semibold text-indigo-950">
                            Required for {registration.supplierCategory}
                        </p>
                        <p className="mt-1 text-sm text-indigo-800">
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
                            All required documents are saved in this browser.
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