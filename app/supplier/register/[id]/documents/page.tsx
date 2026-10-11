"use client";

import {
    ChangeEvent,
    useEffect,
    useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

import {
    getRegistrations,
    getRegistrationDynamicFiles,
    getSupplierItems,
    saveSupplierItems,
} from "@/lib/storage";
import {
    getRequiredDocuments,
    dynamicFileToRequiredDocument,
    RequiredDocument,
    getUnitsOfMeasurement,
} from "@/lib/document-requirements";
import { getRegistrationRules } from "@/lib/rules";
import type { RegistrationRule } from "@/lib/rules";
import type { DynamicFileRequirement, SupplyingItem } from "@/types/registration";

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

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function getDocumentsKey(registrationId: string) {
    return `supplier-documents-${registrationId}`;
}

function formatFileSize(fileSize: number) {
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SupplierDocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [registration, setRegistration] =
        useState<Registration | null>(null);
    const [documents, setDocuments] =
        useState<StoredDocument[]>([]);
    const [dynamicFileRequirements, setDynamicFileRequirements] =
        useState<DynamicFileRequirement[]>([]);
    const [rules, setRules] =
        useState<RegistrationRule[]>([]);
    const [purchaseValue, setPurchaseValue] =
        useState(0);
    const [items, setItems] =
        useState<SupplyingItem[]>([]);
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

        const dynamicFiles = getRegistrationDynamicFiles(id);
        if (dynamicFiles && dynamicFiles.length > 0) {
            setDynamicFileRequirements(dynamicFiles);
        }

        const savedItems = getSupplierItems(id);
        if (savedItems && savedItems.length > 0) {
            setItems(savedItems);
        } else {
            const initialUom =
                getUnitsOfMeasurement(currentRegistration.supplierCategory)[0] ||
                "Pieces (Pcs)";
            setItems([
                {
                    id: crypto.randomUUID(),
                    name: "",
                    uom: initialUom,
                    price: "",
                },
            ]);
        }

        setLoading(false);
    }, [id]);

    const categoryDocuments = registration
        ? getRequiredDocuments(
            registration.supplierCategory,
            rules,
            purchaseValue
        )
        : [];

    const dynamicDocuments: RequiredDocument[] = dynamicFileRequirements.map(
        dynamicFileToRequiredDocument
    );

    const allDocuments: RequiredDocument[] = [
        ...categoryDocuments,
        ...dynamicDocuments,
    ];

    function saveDocuments(nextDocuments: StoredDocument[]) {
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

        if (
            document.allowedExtensions &&
            document.allowedExtensions.length > 0
        ) {
            const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
            const normalizedAllowed = document.allowedExtensions.map((ext) =>
                ext.toLowerCase()
            );

            if (!normalizedAllowed.includes(fileExtension)) {
                setError(
                    `Invalid file type for ${document.label}. Allowed file types: ${document.allowedExtensions.join(
                        ", "
                    )}.`
                );
                event.target.value = "";
                return;
            }
        }

        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setError(`Unable to read ${document.label}.`);
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
                    documents.find((item) => item.key === document.key)
                        ?.metadata || {},
            };

            saveDocuments([
                ...documents.filter((item) => item.key !== document.key),
                storedDocument,
            ]);
        };

        reader.onerror = () => {
            setError(`Unable to read ${document.label}.`);
        };

        reader.readAsDataURL(file);
    }

    function removeDocument(documentKey: string) {
        saveDocuments(
            documents.filter((document) => document.key !== documentKey)
        );
    }

    function handleAddItem() {
        const defaultUom = registration
            ? getUnitsOfMeasurement(registration.supplierCategory)[0] || "Pieces (Pcs)"
            : "Pieces (Pcs)";

        const updated = [
            ...items,
            {
                id: crypto.randomUUID(),
                name: "",
                uom: defaultUom,
                price: "",
            },
        ];
        setItems(updated);
        saveSupplierItems(id, updated);
        setSaved(false);
    }

    function handleItemChange(
        index: number,
        field: keyof SupplyingItem,
        value: string
    ) {
        const updated = items.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        setItems(updated);
        saveSupplierItems(id, updated);
        setSaved(false);
    }

    function handleRemoveItem(index: number) {
        if (items.length <= 1) return;
        const updated = items.filter((_, i) => i !== index);
        setItems(updated);
        saveSupplierItems(id, updated);
        setSaved(false);
    }

    function handleSubmit() {
        const missingDocuments = allDocuments.filter(
            (requiredDocument) =>
                requiredDocument.required !== false &&
                !documents.some((d) => d.key === requiredDocument.key)
        );

        const missingMetadata = allDocuments.flatMap(
            (requiredDocument) => {
                const uploadedDocument = documents.find(
                    (document) => document.key === requiredDocument.key
                );

                if (!uploadedDocument) return [];

                return requiredDocument.metadataFields
                    .filter(
                        (field) =>
                            !uploadedDocument?.metadata?.[field.key]?.trim()
                    )
                    .map(
                        (field) => `${requiredDocument.label}: ${field.label}`
                    );
            }
        );

        if (missingDocuments.length > 0) {
            setError(
                `Upload all mandatory documents before continuing. Missing: ${missingDocuments
                    .map((document) => document.label)
                    .join(", ")}.`
            );
            return;
        }

        if (missingMetadata.length > 0) {
            setError(
                `Complete all document information before continuing. Missing: ${missingMetadata.join(
                    ", "
                )}.`
            );
            return;
        }

        const invalidItems = items.filter(
            (item) => !item.name.trim() || item.price === "" || Number(item.price) < 0
        );

        if (items.length === 0) {
            setError("Please add at least one item or service details.");
            return;
        }

        if (invalidItems.length > 0) {
            setError(
                "Please fill in Item / Service Name and a valid Unit Price (₹) for all items."
            );
            return;
        }

        saveSupplierItems(id, items);

        setError("");
        setSaved(true);
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb]">
                <p className="text-slate-600">Loading required documents...</p>
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

    const mandatoryCount = allDocuments.filter(
        (doc) => doc.required !== false
    ).length;
    const uploadedMandatoryCount = allDocuments.filter(
        (doc) =>
            doc.required !== false &&
            documents.some((d) => d.key === doc.key)
    ).length;

    return (
        <main className="min-h-screen bg-[#f6f8fb] px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-4xl">
                <button
                    type="button"
                    onClick={() => router.push(`/supplier/register/${id}`)}
                    className="mb-6 text-sm font-medium text-slate-500 hover:text-slate-900 transition flex items-center gap-1"
                >
                    ← Back to company registration details
                </button>

                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                            {registration.supplierCategory} Supplier
                        </span>
                        {dynamicFileRequirements.length > 0 && (
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                                {dynamicFileRequirements.length} Custom File Requirements
                            </span>
                        )}
                    </div>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                        Upload Required Documents &amp; Files
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Upload the category-specific certificates and custom company files required for this onboarding registration. Each file must be 2 MB or smaller.
                    </p>
                </div>

                {/* Progress Overview Card */}
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/70 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="font-semibold text-blue-950">
                                Document Requirements Checklist
                            </p>
                            <p className="mt-1 text-sm text-blue-800">
                                {allDocuments.length} total document requirement{allDocuments.length !== 1 ? "s" : ""} ({mandatoryCount} mandatory, {allDocuments.length - mandatoryCount} optional).
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold text-blue-900 bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs">
                                {uploadedMandatoryCount} / {mandatoryCount} Mandatory Uploaded
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">

                    {/* SECTION: SUPPLYING ITEM & PRICING DETAILS */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between border-b border-slate-100 pb-4 mb-5 gap-1">
                            <h2 className="text-xl font-bold text-slate-900">
                                Supplying Item &amp; Pricing Details
                            </h2>
                            <span className="text-xs text-slate-500">
                                Item baseline for purchase requisition &amp; quote evaluation
                            </span>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div
                                    key={item.id || index}
                                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Item {index + 1}
                                        </span>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                Item / Service Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) =>
                                                    handleItemChange(index, "name", e.target.value)
                                                }
                                                placeholder="Enter the product or service you will supply"
                                                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                Unit of Measurement <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={item.uom}
                                                onChange={(e) =>
                                                    handleItemChange(index, "uom", e.target.value)
                                                }
                                                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                                            >
                                                {getUnitsOfMeasurement(
                                                    registration?.supplierCategory
                                                ).map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                            Unit Price (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-mono text-slate-500">
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={item.price}
                                                onChange={(e) =>
                                                    handleItemChange(index, "price", e.target.value)
                                                }
                                                placeholder="0.00"
                                                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition"
                                >
                                    <span className="text-base leading-none">+</span>
                                    <span>Add Item</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 1: DYNAMIC / CUSTOM FILES (If configured) */}
                    {dynamicDocuments.length > 0 && (
                        <section className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
                            <div className="border-b border-indigo-100 pb-4 mb-5">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📁</span>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Custom Registration Files
                                    </h2>
                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                        Configured by Admin
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Please upload the specific files requested by the onboarding administrator.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {dynamicDocuments.map((document) => {
                                    const uploadedDocument = documents.find(
                                        (item) => item.key === document.key
                                    );

                                    return (
                                        <div
                                            key={document.key}
                                            className="rounded-xl border border-indigo-100/90 bg-indigo-50/10 p-5 transition hover:border-indigo-300"
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-slate-900 text-base">
                                                            {document.label}
                                                        </h3>
                                                        {document.required !== false ? (
                                                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                                                                Mandatory
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                                                Optional
                                                            </span>
                                                        )}
                                                        {document.allowedExtensions && document.allowedExtensions.length > 0 && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 font-mono">
                                                                {document.allowedExtensions.join(", ")}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="mt-1 text-sm text-slate-600">
                                                        {document.description}
                                                    </p>

                                                    {uploadedDocument && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                                                ✓ Uploaded: {uploadedDocument.fileName} ({formatFileSize(uploadedDocument.fileSize)})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex shrink-0 items-center gap-3">
                                                    <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm">
                                                        {uploadedDocument ? "Replace file" : "Upload file"}
                                                        <input
                                                            type="file"
                                                            accept={
                                                                document.allowedExtensions && document.allowedExtensions.length > 0
                                                                    ? document.allowedExtensions.join(",")
                                                                    : ".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                            }
                                                            onChange={(event) =>
                                                                handleFileChange(document, event)
                                                            }
                                                            className="sr-only"
                                                        />
                                                    </label>

                                                    {uploadedDocument && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDocument(document.key)}
                                                            className="text-sm font-semibold text-red-600 hover:text-red-700 transition"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Metadata inputs for dynamic file */}
                                            {uploadedDocument && document.metadataFields.length > 0 && (
                                                <div className="mt-4 grid gap-4 border-t border-indigo-100 pt-4 sm:grid-cols-2">
                                                    {document.metadataFields.map((field) => (
                                                        <div key={field.key}>
                                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                                {field.label} <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type={field.type}
                                                                value={
                                                                    uploadedDocument.metadata?.[field.key] || ""
                                                                }
                                                                onChange={(event) =>
                                                                    updateDocumentMetadata(
                                                                        document.key,
                                                                        field.key,
                                                                        event.target.value
                                                                    )
                                                                }
                                                                placeholder={field.placeholder}
                                                                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* SECTION 2: CATEGORY / STANDARD DOCUMENTS */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="border-b border-slate-100 pb-4 mb-5">
                            <h2 className="text-lg font-bold text-slate-900">
                                Category &amp; Regulatory Documents
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Standard business verification documents required for {registration.supplierCategory} suppliers.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {categoryDocuments.map((document) => {
                                const uploadedDocument = documents.find(
                                    (item) => item.key === document.key
                                );

                                return (
                                    <div
                                        key={document.key}
                                        className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900 text-base">
                                                        {document.label}
                                                    </h3>
                                                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                                                        Mandatory
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {document.description}
                                                </p>

                                                {uploadedDocument && (
                                                    <p className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block border border-emerald-200">
                                                        ✓ Uploaded: {uploadedDocument.fileName} ({formatFileSize(uploadedDocument.fileSize)})
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                                <label className="cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition shadow-sm">
                                                    {uploadedDocument ? "Replace file" : "Choose file"}
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                        onChange={(event) =>
                                                            handleFileChange(document, event)
                                                        }
                                                        className="sr-only"
                                                    />
                                                </label>

                                                {uploadedDocument && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDocument(document.key)}
                                                        className="text-sm font-semibold text-red-600 hover:text-red-700 transition"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {uploadedDocument && document.metadataFields.length > 0 && (
                                            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                                                {document.metadataFields.map((field) => (
                                                    <div key={field.key}>
                                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                            {field.label} <span className="text-red-500">*</span>
                                                        </label>

                                                        <input
                                                            type={field.type}
                                                            value={
                                                                uploadedDocument.metadata?.[field.key] || ""
                                                            }
                                                            onChange={(event) =>
                                                                updateDocumentMetadata(
                                                                    document.key,
                                                                    field.key,
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder={field.placeholder}
                                                            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Error Banner */}
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm flex items-center gap-2">
                            <span className="font-bold">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success Banner */}
                    {saved && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">🎉</span>
                                <div>
                                    <h3 className="font-bold text-emerald-900 text-sm">
                                        All Documents &amp; Dynamic Files Saved!
                                    </h3>
                                    <p className="text-xs text-emerald-800 mt-0.5">
                                        Your documents have been recorded. The administrator will review your registration submission.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Bar */}
                    <div className="flex items-center justify-between pt-4">
                        <button
                            type="button"
                            onClick={() => router.push(`/supplier/register/${id}`)}
                            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                            Back to Form Fields
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="rounded-xl bg-blue-700 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition shadow-md focus:ring-4 focus:ring-blue-100"
                        >
                            Save Documents &amp; Complete Submission
                        </button>
                    </div>

                </div>
            </div>
        </main>
    );
}