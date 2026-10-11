"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getRegistrations,
    updateRegistrationRequiredFields,
    getRegistrationDynamicFiles,
    saveRegistrationDynamicFiles,
} from "@/lib/storage";
import { DynamicFileRequirement } from "@/types/registration";
import {
    getRegistrationRules,
    RegistrationRule,
} from "@/lib/rules";
import {
    getRequiredDocuments,
    RequiredDocument,
} from "@/lib/document-requirements";

interface DynamicField {
    id: string;
    label: string;
    type:
    | "text"
    | "email"
    | "number"
    | "date"
    | "dropdown"
    | "textarea";
    required: boolean;
    options: string[];
}

interface Registration {
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
    createdAt: string;
}

const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "email", label: "Email" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "dropdown", label: "Dropdown" },
    { value: "textarea", label: "Textarea" },
];

const basicFieldOptions = [
    { key: "companyName", label: "Company Name", mandatory: false },
    { key: "companyEmail", label: "Company Email", mandatory: false },
    { key: "phone", label: "Phone Number", mandatory: false },
    { key: "address", label: "Company Address", mandatory: false },
    { key: "country", label: "Country", mandatory: false },
    { key: "taxId", label: "Tax / GST Number", mandatory: false },
    {
        key: "expectedPurchaseValue",
        label: "Expected Purchase Value (INR)",
        mandatory: false,
    },
];

const filePresets = [
    {
        label: "Non-Disclosure Agreement (NDA)",
        description: "Upload signed and stamped NDA copy.",
        required: true,
        allowedExtensions: [".pdf"],
        collectCompanyName: true,
        collectDocNumber: false,
        collectIssueDate: true,
        collectExpiryDate: false,
    },
    {
        label: "Vendor Code of Conduct",
        description: "Acknowledged and signed vendor code of conduct document.",
        required: true,
        allowedExtensions: [".pdf"],
        collectCompanyName: true,
        collectDocNumber: false,
        collectIssueDate: true,
        collectExpiryDate: false,
    },
    {
        label: "MSME / Udyam Certificate",
        description: "Valid MSME or Udyam registration certificate.",
        required: false,
        allowedExtensions: [".pdf", ".jpg", ".png"],
        collectCompanyName: true,
        collectDocNumber: true,
        collectIssueDate: true,
        collectExpiryDate: false,
    },
    {
        label: "Quality & Safety Policy",
        description: "Company workplace health, safety, and quality policy document.",
        required: false,
        allowedExtensions: [".pdf", ".docx"],
        collectCompanyName: false,
        collectDocNumber: false,
        collectIssueDate: false,
        collectExpiryDate: false,
    },
    {
        label: "Cancelled Cheque / Bank Letter",
        description: "Cancelled cheque or official bank account verification letter.",
        required: true,
        allowedExtensions: [".pdf", ".jpg", ".png"],
        collectCompanyName: true,
        collectDocNumber: true,
        collectIssueDate: false,
        collectExpiryDate: false,
    },
];

const availableFileExtensions = [
    { label: "PDF (.pdf)", value: ".pdf" },
    { label: "JPG (.jpg, .jpeg)", value: ".jpg" },
    { label: "PNG (.png)", value: ".png" },
    { label: "Word (.doc, .docx)", value: ".docx" },
];

export default function DynamicFieldsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [registration, setRegistration] =
        useState<Registration | null>(null);
    const [fields, setFields] = useState<DynamicField[]>([]);
    const [dynamicFiles, setDynamicFiles] = useState<DynamicFileRequirement[]>([]);
    const [rules, setRules] = useState<RegistrationRule[]>([]);
    const [activeTab, setActiveTab] = useState<"fields" | "files" | "all">("fields");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const registrations = getRegistrations();
        const currentRegistration = registrations.find(
            (item) => item.id === id
        );

        if (!currentRegistration) {
            setLoading(false);
            return;
        }

        setRegistration({
            ...currentRegistration,
            requiredFields: Array.from(
                new Set(currentRegistration.requiredFields || [])
            ),
        });

        setRules(getRegistrationRules(id));

        const savedFields = localStorage.getItem(
            `registration-fields-${id}`
        );
        if (savedFields) {
            setFields(JSON.parse(savedFields));
        }

        const savedFiles = getRegistrationDynamicFiles(id);
        if (savedFiles && savedFiles.length > 0) {
            setDynamicFiles(savedFiles);
        }

        setLoading(false);
    }, [id]);

    const categoryDocuments: RequiredDocument[] = registration
        ? getRequiredDocuments(registration.supplierCategory, rules)
        : [];

    function handleBasicFieldChange(fieldKey: string) {
        setRegistration((currentRegistration) => {
            if (!currentRegistration) {
                return currentRegistration;
            }

            const requiredFields = currentRegistration.requiredFields.includes(
                fieldKey
            )
                ? currentRegistration.requiredFields.filter(
                    (currentField) => currentField !== fieldKey
                )
                : [
                    ...currentRegistration.requiredFields,
                    fieldKey,
                ];

            setSaved(false);

            return {
                ...currentRegistration,
                requiredFields,
            };
        });
    }

    /* ---------------- DYNAMIC FORM FIELDS ---------------- */

    function addField() {
        const newField: DynamicField = {
            id: crypto.randomUUID(),
            label: "",
            type: "text",
            required: false,
            options: [],
        };

        setFields((previousFields) => [
            ...previousFields,
            newField,
        ]);
        setActiveTab("fields");
        setSaved(false);
    }

    function updateField(
        fieldId: string,
        property: keyof DynamicField,
        value: string | boolean | string[]
    ) {
        setFields((previousFields) =>
            previousFields.map((field) =>
                field.id === fieldId
                    ? {
                        ...field,
                        [property]: value,
                    }
                    : field
            )
        );
        setSaved(false);
    }

    function removeField(fieldId: string) {
        setFields((previousFields) =>
            previousFields.filter(
                (field) => field.id !== fieldId
            )
        );
        setSaved(false);
    }

    function updateOption(
        fieldId: string,
        optionIndex: number,
        value: string
    ) {
        setFields((previousFields) =>
            previousFields.map((field) => {
                if (field.id !== fieldId) {
                    return field;
                }

                const updatedOptions = [...field.options];
                updatedOptions[optionIndex] = value;

                return {
                    ...field,
                    options: updatedOptions,
                };
            })
        );
        setSaved(false);
    }

    function addOption(fieldId: string) {
        setFields((previousFields) =>
            previousFields.map((field) => {
                if (field.id !== fieldId) {
                    return field;
                }

                return {
                    ...field,
                    options: [
                        ...field.options,
                        "",
                    ],
                };
            })
        );
        setSaved(false);
    }

    function removeOption(
        fieldId: string,
        optionIndex: number
    ) {
        setFields((previousFields) =>
            previousFields.map((field) => {
                if (field.id !== fieldId) {
                    return field;
                }

                return {
                    ...field,
                    options: field.options.filter(
                        (_, index) => index !== optionIndex
                    ),
                };
            })
        );
        setSaved(false);
    }

    /* ---------------- DYNAMIC FILE REQUIREMENTS ---------------- */

    function addDynamicFile(preset?: Partial<DynamicFileRequirement>) {
        const newFile: DynamicFileRequirement = {
            id: crypto.randomUUID(),
            label: preset?.label || "",
            description: preset?.description || "",
            required: preset?.required !== undefined ? preset.required : true,
            allowedExtensions: preset?.allowedExtensions || [".pdf", ".jpg", ".png", ".docx"],
            collectCompanyName: preset?.collectCompanyName !== undefined ? preset.collectCompanyName : true,
            collectDocNumber: preset?.collectDocNumber || false,
            collectIssueDate: preset?.collectIssueDate || false,
            collectExpiryDate: preset?.collectExpiryDate || false,
        };

        setDynamicFiles((prev) => [...prev, newFile]);
        setActiveTab("files");
        setSaved(false);
    }

    function updateDynamicFile(
        fileId: string,
        property: keyof DynamicFileRequirement,
        value: string | boolean | string[]
    ) {
        setDynamicFiles((prev) =>
            prev.map((file) =>
                file.id === fileId
                    ? {
                        ...file,
                        [property]: value,
                    }
                    : file
            )
        );
        setSaved(false);
    }

    function toggleExtension(fileId: string, extension: string) {
        setDynamicFiles((prev) =>
            prev.map((file) => {
                if (file.id !== fileId) return file;
                const current = file.allowedExtensions || [];
                const updated = current.includes(extension)
                    ? current.filter((ext) => ext !== extension)
                    : [...current, extension];
                return {
                    ...file,
                    allowedExtensions: updated.length > 0 ? updated : [".pdf"],
                };
            })
        );
        setSaved(false);
    }

    function removeDynamicFile(fileId: string) {
        setDynamicFiles((prev) => prev.filter((file) => file.id !== fileId));
        setSaved(false);
    }

    /* ---------------- FORM SUBMIT ---------------- */

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        // Validate Dynamic Form Fields
        const hasEmptyFieldLabel = fields.some(
            (field) => field.label.trim().length === 0
        );

        if (hasEmptyFieldLabel) {
            setError("Please provide a label for every dynamic form field.");
            setActiveTab("fields");
            return;
        }

        const invalidDropdown = fields.some(
            (field) =>
                field.type === "dropdown" &&
                field.options.filter((option) => option.trim().length > 0)
                    .length === 0
        );

        if (invalidDropdown) {
            setError(
                "Every dropdown field must have at least one valid option."
            );
            setActiveTab("fields");
            return;
        }

        // Validate Dynamic Files
        const hasEmptyFileLabel = dynamicFiles.some(
            (file) => file.label.trim().length === 0
        );

        if (hasEmptyFileLabel) {
            setError(
                "Please provide a document title / label for every dynamic file requirement."
            );
            setActiveTab("files");
            return;
        }

        const cleanedFields = fields.map((field) => ({
            ...field,
            label: field.label.trim(),
            options:
                field.type === "dropdown"
                    ? field.options
                        .map((option) => option.trim())
                        .filter(Boolean)
                    : [],
        }));

        const cleanedFiles = dynamicFiles.map((file) => ({
            ...file,
            label: file.label.trim(),
            description: file.description.trim(),
            collectCompanyName: file.collectCompanyName !== undefined ? file.collectCompanyName : true,
            allowedExtensions:
                file.allowedExtensions && file.allowedExtensions.length > 0
                    ? file.allowedExtensions
                    : [".pdf", ".jpg", ".png", ".docx"],
        }));

        localStorage.setItem(
            `registration-fields-${id}`,
            JSON.stringify(cleanedFields)
        );

        saveRegistrationDynamicFiles(id, cleanedFiles);

        setFields(cleanedFields);
        setDynamicFiles(cleanedFiles);

        if (!registration) {
            return;
        }

        updateRegistrationRequiredFields(
            id,
            registration.requiredFields
        );

        if (registration.registrationType === "closed") {
            router.push(`/admin/registrations/${id}/invitations`);
            return;
        }

        if (registration.registrationType === "hybrid") {
            router.push(`/admin/registrations/${id}/requests`);
            return;
        }

        setSaved(true);
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function copyRegistrationLink() {
        if (!registration) return;

        const fullLink = `${window.location.origin}${registration.registrationLink}`;
        await navigator.clipboard.writeText(fullLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f6f8fb] flex items-center justify-center">
                <p className="text-slate-600">Loading registration configuration...</p>
            </div>
        );
    }

    if (!registration) {
        return (
            <div className="min-h-screen bg-[#f6f8fb] flex items-center justify-center">
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <h1 className="text-xl font-semibold text-slate-900">
                        Registration not found
                    </h1>
                    <button
                        onClick={() => router.push("/admin")}
                        className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-white hover:bg-blue-800"
                    >
                        Back to Admin Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const fullRegistrationLink =
        typeof window !== "undefined"
            ? `${window.location.origin}${registration.registrationLink}`
            : registration.registrationLink;

    const totalFilesCount = categoryDocuments.length + dynamicFiles.length;

    return (
        <div className="min-h-screen bg-[#f6f8fb]">
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-flex items-center gap-1 font-medium transition"
                    >
                        ← Back to Admin Dashboard
                    </button>

                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
                                Configure Registration
                            </p>

                            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                                {registration.name}
                            </h1>

                            <p className="mt-2 text-slate-600">
                                Configure the dynamic form fields and dynamic file upload requirements for suppliers.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Registration Type
                            </p>
                            <p className="mt-1 font-semibold text-slate-900 capitalize">
                                {registration.registrationType}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ready Banner */}
                {saved && (
                    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold">
                                ✓
                            </div>

                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-emerald-950">
                                    Registration Configuration Saved Successfully
                                </h2>

                                <p className="mt-1 text-sm text-emerald-800">
                                    {fields.length} dynamic field{fields.length !== 1 ? "s" : ""}, {categoryDocuments.length} mandatory category document{categoryDocuments.length !== 1 ? "s" : ""}, and{" "}
                                    {dynamicFiles.length} custom dynamic file{dynamicFiles.length !== 1 ? "s" : ""}{" "}
                                    have been saved. Share the registration link with suppliers.
                                </p>

                                <div className="mt-5 flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 bg-white border border-emerald-200 rounded-lg px-4 py-3 text-sm text-slate-700 break-all select-all font-mono">
                                        {fullRegistrationLink}
                                    </div>

                                    <button
                                        onClick={copyRegistrationLink}
                                        className="px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 whitespace-nowrap transition shadow-sm"
                                    >
                                        {copied ? "Copied!" : "Copy Link"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Information cards */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                            Supplier Category
                        </p>
                        <p className="mt-2 font-semibold text-slate-900 text-lg">
                            {registration.supplierCategory}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                            Start Date
                        </p>
                        <p className="mt-2 font-semibold text-slate-900 text-lg">
                            {registration.startDate}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                            End Date
                        </p>
                        <p className="mt-2 font-semibold text-slate-900 text-lg">
                            {registration.endDate}
                        </p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="mb-8 border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 flex items-center justify-between gap-4 overflow-x-auto shadow-sm">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("fields")}
                            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === "fields"
                                ? "border-blue-600 text-blue-700"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                        >
                            <span>📝 Form Fields</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                                {registration.requiredFields.length + fields.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("files")}
                            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === "files"
                                ? "border-blue-600 text-blue-700"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                        >
                            <span>📁 File Upload Requirements</span>
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800 font-bold">
                                {totalFilesCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("all")}
                            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === "all"
                                ? "border-blue-600 text-blue-700"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                        >
                            <span>👁️ View All</span>
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 pb-3">
                        <button
                            type="button"
                            onClick={addField}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                            + Add Field
                        </button>
                        <button
                            type="button"
                            onClick={() => addDynamicFile()}
                            className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                        >
                            + Add Custom File
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm flex items-center gap-3">
                        <span className="font-bold text-red-600 text-base">⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* SECTION: FORM FIELDS (Basic & Dynamic) */}
                    {(activeTab === "fields" || activeTab === "all") && (
                        <div className="space-y-6">

                            {/* Basic Fields */}
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">
                                                Standard Information Fields
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Select standard corporate information fields required from the supplier.
                                            </p>
                                        </div>
                                        <span className="text-xs font-semibold rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                                            {registration.requiredFields.length} selected
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
                                    {basicFieldOptions.map((field) => (
                                        <label
                                            key={field.key}
                                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${registration.requiredFields.includes(field.key)
                                                ? "border-blue-300 bg-blue-50/70 text-blue-950 font-medium"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={registration.requiredFields.includes(
                                                    field.key
                                                )}
                                                onChange={() =>
                                                    handleBasicFieldChange(field.key)
                                                }
                                                className="h-4 w-4 rounded accent-blue-700"
                                            />
                                            <span className="text-sm">
                                                {field.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* Dynamic Input Fields */}
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">
                                                Custom Dynamic Fields
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Create additional custom input fields (text, dropdowns, dates, numbers) for suppliers.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addField}
                                            className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow-sm"
                                        >
                                            + Add Field
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8 space-y-5">
                                    {fields.length === 0 ? (
                                        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
                                            <p className="text-sm font-medium text-slate-600">
                                                No dynamic form fields added yet.
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Suppliers will only provide the standard company fields selected above.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={addField}
                                                className="mt-4 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                                            >
                                                + Add First Dynamic Field
                                            </button>
                                        </div>
                                    ) : (
                                        fields.map((field, index) => (
                                            <div
                                                key={field.id}
                                                className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm transition hover:border-slate-300"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                                                            {index + 1}
                                                        </span>
                                                        <h3 className="font-semibold text-slate-900 text-sm">
                                                            {field.label || `Field ${index + 1}`}
                                                        </h3>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeField(field.id)}
                                                        className="text-xs font-semibold text-red-600 hover:text-red-800 transition"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                            Field Label
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(event) =>
                                                                updateField(
                                                                    field.id,
                                                                    "label",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: Secondary Contact Person"
                                                            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                            Field Type
                                                        </label>
                                                        <select
                                                            value={field.type}
                                                            onChange={(event) =>
                                                                updateField(
                                                                    field.id,
                                                                    "type",
                                                                    event.target.value as DynamicField["type"]
                                                                )
                                                            }
                                                            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        >
                                                            {fieldTypes.map((type) => (
                                                                <option key={type.value} value={type.value}>
                                                                    {type.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Required Toggle */}
                                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-800">
                                                            Mandatory field
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Supplier must fill this field to complete registration.
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateField(
                                                                field.id,
                                                                "required",
                                                                !field.required
                                                            )
                                                        }
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${field.required ? "bg-blue-600" : "bg-slate-300"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${field.required ? "translate-x-5" : "translate-x-1"
                                                                }`}
                                                        />
                                                    </button>
                                                </div>

                                                {/* Dropdown Options */}
                                                {field.type === "dropdown" && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-xs font-semibold text-slate-800">
                                                                Dropdown Options
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => addOption(field.id)}
                                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                                            >
                                                                + Add Option
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {field.options.map((option, optIdx) => (
                                                                <div key={optIdx} className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={option}
                                                                        onChange={(event) =>
                                                                            updateOption(
                                                                                field.id,
                                                                                optIdx,
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        placeholder={`Option ${optIdx + 1}`}
                                                                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeOption(field.id, optIdx)
                                                                        }
                                                                        className="px-2 text-xs text-red-500 hover:text-red-700"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* SECTION: FILE UPLOAD REQUIREMENTS */}
                    {(activeTab === "files" || activeTab === "all") && (
                        <div className="space-y-6">

                            {/* 1. MANDATORY CATEGORY VERIFICATION DOCUMENTS */}
                            <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
                                <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-slate-50/40 px-6 py-5 sm:px-8">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">🏛️</span>
                                                <h2 className="text-lg font-bold text-slate-900">
                                                    Mandatory Category Documents ({registration.supplierCategory})
                                                </h2>
                                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                                                    Category Standard
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                                                These {categoryDocuments.length} baseline documents are standard and automatically required for all {registration.supplierCategory} suppliers.
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-right shadow-2xs">
                                            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                                                Category Base Files
                                            </p>
                                            <p className="font-bold text-blue-900 text-sm">
                                                {categoryDocuments.length} Mandatory Files
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {categoryDocuments.map((doc, idx) => (
                                            <div
                                                key={doc.key}
                                                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:bg-white hover:border-blue-300 hover:shadow-xs"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-800">
                                                            {idx + 1}
                                                        </span>
                                                        <h3 className="text-sm font-bold text-slate-900">
                                                            {doc.label}
                                                        </h3>
                                                    </div>
                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                                                        Mandatory
                                                    </span>
                                                </div>

                                                <p className="text-xs text-slate-500 mb-3">
                                                    {doc.description}
                                                </p>

                                                {doc.metadataFields && doc.metadataFields.length > 0 && (
                                                    <div className="pt-2.5 border-t border-slate-200/60">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                                            Required document metadata:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {doc.metadataFields.map((field) => (
                                                                <span
                                                                    key={field.key}
                                                                    className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                                                >
                                                                    {field.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* 2. CUSTOM DYNAMIC FILE UPLOAD REQUIREMENTS */}
                            <section className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
                                <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 px-6 py-5 sm:px-8">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">📁</span>
                                                <h2 className="text-lg font-bold text-slate-900">
                                                    Custom Dynamic File Requirements
                                                </h2>
                                                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                                                    Custom Uploads
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                                                Dynamically specify additional custom documents, contracts, policies, or certificates that suppliers must upload in addition to the category standard files above.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => addDynamicFile()}
                                            className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
                                        >
                                            <span>+</span>
                                            <span>Add Custom File</span>
                                        </button>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="mt-4 pt-4 border-t border-indigo-100/70">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                            Quick Templates / Presets:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {filePresets.map((preset, pIdx) => (
                                                <button
                                                    key={pIdx}
                                                    type="button"
                                                    onClick={() => addDynamicFile(preset)}
                                                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-900 hover:bg-indigo-50 hover:border-indigo-300 transition shadow-2xs"
                                                >
                                                    + {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8 space-y-6">
                                    {dynamicFiles.length === 0 ? (
                                        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-10 text-center bg-indigo-50/20">
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold mb-3">
                                                📄
                                            </div>
                                            <h3 className="text-base font-semibold text-slate-900">
                                                No custom dynamic files added yet
                                            </h3>
                                            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                                                Suppliers will be required to upload the {categoryDocuments.length} mandatory category files shown above. You can also add custom file requirements (e.g. NDAs, agreements, or certifications).
                                            </p>
                                            <div className="mt-5 flex justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => addDynamicFile()}
                                                    className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                                                >
                                                    + Create Custom File Requirement
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        dynamicFiles.map((file, index) => (
                                            <div
                                                key={file.id}
                                                className="border border-slate-200 rounded-xl p-6 bg-white shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
                                            >
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900 text-base">
                                                                {file.label || `Custom File ${index + 1}`}
                                                            </h3>
                                                            <p className="text-xs text-slate-500">
                                                                {file.required ? (
                                                                    <span className="text-red-600 font-semibold">Mandatory Upload</span>
                                                                ) : (
                                                                    <span className="text-slate-500">Optional Upload</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeDynamicFile(file.id)}
                                                        className="text-xs font-semibold text-red-600 hover:text-red-800 transition px-2 py-1 rounded hover:bg-red-50"
                                                    >
                                                        Remove Requirement
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    {/* Document Label */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                            Document Name / Title <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={file.label}
                                                            onChange={(event) =>
                                                                updateDynamicFile(
                                                                    file.id,
                                                                    "label",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="e.g. Non-Disclosure Agreement (NDA)"
                                                            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                        />
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                            Instructions for Supplier
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={file.description}
                                                            onChange={(event) =>
                                                                updateDynamicFile(
                                                                    file.id,
                                                                    "description",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="e.g. Signed and stamped copy by company director"
                                                            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Allowed File Formats */}
                                                <div className="mt-5 pt-4 border-t border-slate-100">
                                                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                        Allowed File Formats
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {availableFileExtensions.map((ext) => {
                                                            const isChecked = (file.allowedExtensions || []).includes(ext.value);
                                                            return (
                                                                <button
                                                                    key={ext.value}
                                                                    type="button"
                                                                    onClick={() => toggleExtension(file.id, ext.value)}
                                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${isChecked
                                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-semibold"
                                                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                                        }`}
                                                                >
                                                                    {isChecked ? "✓ " : ""}{ext.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Metadata Collection Options */}
                                                <div className="mt-5 pt-4 border-t border-slate-100">
                                                    <p className="text-xs font-semibold text-slate-800 mb-1">
                                                        Collect Document Metadata
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mb-3">
                                                        Ask suppliers to input details alongside the uploaded file.
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(file.collectCompanyName)}
                                                                onChange={(e) =>
                                                                    updateDynamicFile(
                                                                        file.id,
                                                                        "collectCompanyName",
                                                                        e.target.checked
                                                                    )
                                                                }
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            <span>Company Name as per Document</span>
                                                        </label>

                                                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(file.collectDocNumber)}
                                                                onChange={(e) =>
                                                                    updateDynamicFile(
                                                                        file.id,
                                                                        "collectDocNumber",
                                                                        e.target.checked
                                                                    )
                                                                }
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            <span>Document / Ref Number</span>
                                                        </label>

                                                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(file.collectIssueDate)}
                                                                onChange={(e) =>
                                                                    updateDynamicFile(
                                                                        file.id,
                                                                        "collectIssueDate",
                                                                        e.target.checked
                                                                    )
                                                                }
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            <span>Issue Date</span>
                                                        </label>

                                                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(file.collectExpiryDate)}
                                                                onChange={(e) =>
                                                                    updateDynamicFile(
                                                                        file.id,
                                                                        "collectExpiryDate",
                                                                        e.target.checked
                                                                    )
                                                                }
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            <span>Expiry Date</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Mandatory Toggle */}
                                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-800">
                                                            Mandatory File Requirement
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            If enabled, supplier cannot proceed without uploading this file.
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateDynamicFile(
                                                                file.id,
                                                                "required",
                                                                !file.required
                                                            )
                                                        }
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${file.required ? "bg-indigo-600" : "bg-slate-300"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${file.required ? "translate-x-5" : "translate-x-1"
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Bottom Save Bar */}
                    <div className="flex items-center justify-between pt-4 pb-12">
                        <div className="text-xs text-slate-500">
                            {registration.requiredFields.length + fields.length} fields &amp; {totalFilesCount} files ({categoryDocuments.length} category standard + {dynamicFiles.length} custom)
                        </div>

                        <button
                            type="submit"
                            className="px-8 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition shadow-md focus:ring-4 focus:ring-blue-100 text-sm"
                        >
                            Save All Fields &amp; Files
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}