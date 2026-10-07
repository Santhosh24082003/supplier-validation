"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getRegistrations,
    updateRegistrationRequiredFields,
} from "@/lib/storage";

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
    {
        value: "text",
        label: "Text",
    },
    {
        value: "email",
        label: "Email",
    },
    {
        value: "number",
        label: "Number",
    },
    {
        value: "date",
        label: "Date",
    },
    {
        value: "dropdown",
        label: "Dropdown",
    },
    {
        value: "textarea",
        label: "Textarea",
    },
];

const basicFieldOptions = [
    { key: "companyName", label: "Company Name" },
    { key: "companyEmail", label: "Company Email" },
    { key: "phone", label: "Phone Number" },
    { key: "address", label: "Company Address" },
    { key: "country", label: "Country" },
    { key: "taxId", label: "Tax / GST Number" },
    {
        key: "expectedPurchaseValue",
        label: "Expected Purchase Value (INR)",
    },
];

export default function DynamicFieldsPage() {
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;

    const [registration, setRegistration] =
        useState<Registration | null>(null);

    const [fields, setFields] = useState<DynamicField[]>([]);

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

        setRegistration(currentRegistration);

        const savedFields = localStorage.getItem(
            `registration-fields-${id}`
        );

        if (savedFields) {
            setFields(JSON.parse(savedFields));
        }

        setLoading(false);
    }, [id]);

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
                        (_, index) =>
                            index !== optionIndex
                    ),
                };
            })
        );

        setSaved(false);
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        if (fields.length === 0) {
            setError(
                "Please add at least one dynamic field."
            );

            return;
        }

        const hasEmptyLabel = fields.some(
            (field) =>
                field.label.trim().length === 0
        );

        if (hasEmptyLabel) {
            setError(
                "Please provide a label for every field."
            );

            return;
        }

        const invalidDropdown = fields.some(
            (field) =>
                field.type === "dropdown" &&
                field.options.filter(
                    (option) =>
                        option.trim().length > 0
                ).length === 0
        );

        if (invalidDropdown) {
            setError(
                "Every dropdown field must have at least one option."
            );

            return;
        }

        const cleanedFields = fields.map(
            (field) => ({
                ...field,
                label: field.label.trim(),
                options:
                    field.type === "dropdown"
                        ? field.options
                            .map((option) =>
                                option.trim()
                            )
                            .filter(Boolean)
                        : [],
            })
        );

        localStorage.setItem(
            `registration-fields-${id}`,
            JSON.stringify(cleanedFields)
        );

        setFields(cleanedFields);

        if (!registration) {
            return;
        }

        updateRegistrationRequiredFields(
            id,
            registration.requiredFields
        );

        if (registration.registrationType === "closed") {
            router.push(
                `/admin/registrations/${id}/invitations`
            );

            return;
        }

        if (registration.registrationType === "hybrid") {
            router.push(
                `/admin/registrations/${id}/requests`
            );

            return;
        }

        setSaved(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function copyRegistrationLink() {
        if (!registration) {
            return;
        }

        const fullLink =
            `${window.location.origin}${registration.registrationLink}`;

        await navigator.clipboard.writeText(
            fullLink
        );

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }

    function openSupplierRegistration() {
        if (!registration) {
            return;
        }

        router.push(
            registration.registrationLink
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f6f8fb] flex items-center justify-center">
                <p className="text-slate-600">
                    Loading registration...
                </p>
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
                        onClick={() =>
                            router.push(
                                "/admin"
                            )
                        }
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

    return (
        <div className="min-h-screen bg-[#f6f8fb]">
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() =>
                            router.push(
                                "/admin"
                            )
                        }
                        className="text-sm text-slate-500 hover:text-slate-900 mb-4"
                    >
                        ← Back to Admin Dashboard
                    </button>

                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="mb-2 text-sm font-medium text-blue-700">
                                Configure Registration
                            </p>

                            <h1 className="text-3xl font-bold text-slate-900">
                                {registration.name}
                            </h1>

                            <p className="mt-2 text-slate-500">
                                Configure the dynamic fields
                                suppliers need to complete.
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

                {/* Registration Ready Banner */}
                {saved && (
                    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl">
                                ✓
                            </div>

                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-emerald-900">
                                    Registration is ready
                                </h2>

                                <p className="mt-1 text-sm text-emerald-800">
                                    Your dynamic fields have
                                    been saved. Share the
                                    registration link with
                                    suppliers.
                                </p>

                                <div className="mt-5 flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 bg-white border border-emerald-200 rounded-lg px-4 py-3 text-sm text-slate-700 break-all">
                                        {fullRegistrationLink}
                                    </div>

                                    <button
                                        onClick={
                                            copyRegistrationLink
                                        }
                                        className="px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 whitespace-nowrap"
                                    >
                                        {copied
                                            ? "Copied!"
                                            : "Copy Link"}
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-3">
                                    {/* <button
                                        onClick={
                                            openSupplierRegistration
                                        }
                                        className="px-4 py-2.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 font-medium hover:bg-emerald-100"
                                    >
                                        Preview Supplier Form
                                    </button> */}

                                    {/* <button
                                        onClick={() =>
                                            router.push(
                                                "/admin"
                                            )
                                        }
                                        className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
                                    >
                                        Back to Admin Dashboard
                                    </button> */}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Registration Information */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            Supplier Category
                        </p>

                        <p className="mt-2 font-semibold text-slate-900">
                            {registration.supplierCategory}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            Start Date
                        </p>

                        <p className="mt-2 font-semibold text-slate-900">
                            {registration.startDate}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            End Date
                        </p>

                        <p className="mt-2 font-semibold text-slate-900">
                            {registration.endDate}
                        </p>
                    </div>
                </div>

                <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Basic Fields
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Choose the standard information suppliers must provide.
                                </p>
                            </div>
                            <span className="text-sm text-slate-500">
                                {registration.requiredFields.length} selected
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
                        {basicFieldOptions.map((field) => (
                            <label
                                key={field.key}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${registration.requiredFields.includes(field.key)
                                    ? "border-blue-300 bg-blue-50 text-blue-950"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
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
                                <span className="text-sm font-medium">
                                    {field.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                {/* Sticky Action Header */}
                <div className="sticky top-0 z-30 mb-6 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                Dynamic Fields
                            </h2>

                            <p className="text-sm text-slate-500">
                                {fields.length} field
                                {fields.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                configured
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addField}
                            className="px-5 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm"
                        >
                            + Add Field
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Fields */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >
                    {fields.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-4">
                                +
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900">
                                No dynamic fields yet
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                Click "Add Field" to create
                                the first supplier field.
                            </p>

                            <button
                                type="button"
                                onClick={addField}
                                className="mt-6 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                            >
                                Add First Field
                            </button>
                        </div>
                    ) : (
                        fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-semibold text-sm">
                                            {index + 1}
                                        </div>

                                        <h3 className="font-semibold text-slate-900">
                                            Field{" "}
                                            {index + 1}
                                        </h3>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeField(
                                                field.id
                                            )
                                        }
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Label */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Field Label
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                field.label
                                            }
                                            onChange={(event) =>
                                                updateField(
                                                    field.id,
                                                    "label",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Example: GST Number"
                                            className="w-full rounded-lg border text-black border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Field Type
                                        </label>

                                        <select
                                            value={
                                                field.type
                                            }
                                            onChange={(event) =>
                                                updateField(
                                                    field.id,
                                                    "type",
                                                    event
                                                        .target
                                                        .value as DynamicField["type"]
                                                )
                                            }
                                            className="w-full rounded-lg border text-black border-slate-300 px-4 py-3 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        >
                                            {fieldTypes.map(
                                                (
                                                    type
                                                ) => (
                                                    <option
                                                        key={
                                                            type.value
                                                        }
                                                        value={
                                                            type.value
                                                        }
                                                    >
                                                        {
                                                            type.label
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>
                                </div>

                                {/* Required */}
                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">
                                            Required field
                                        </p>

                                        <p className="text-xs text-slate-500">
                                            Supplier must
                                            provide this
                                            value.
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
                                        className={`relative inline-flex min-h-0 h-6 w-11 items-center rounded-full transition ${field.required
                                            ? "bg-indigo-600"
                                            : "bg-slate-300"
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${field.required
                                                ? "translate-x-6"
                                                : "translate-x-1"
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Dropdown Options */}
                                {field.type ===
                                    "dropdown" && (
                                        <div className="mt-5 border-t border-slate-100 pt-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">
                                                        Dropdown
                                                        Options
                                                    </p>

                                                    <p className="text-xs text-slate-500">
                                                        Add the
                                                        choices
                                                        suppliers
                                                        can select.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        addOption(
                                                            field.id
                                                        )
                                                    }
                                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                                >
                                                    + Add Option
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {field.options
                                                    .length ===
                                                    0 ? (
                                                    <p className="text-sm text-slate-400">
                                                        No options
                                                        added yet.
                                                    </p>
                                                ) : (
                                                    field.options.map(
                                                        (
                                                            option,
                                                            optionIndex
                                                        ) => (
                                                            <div
                                                                key={
                                                                    optionIndex
                                                                }
                                                                className="flex gap-3"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        option
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        updateOption(
                                                                            field.id,
                                                                            optionIndex,
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    placeholder={`Option ${optionIndex +
                                                                        1
                                                                        }`}
                                                                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                                />

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeOption(
                                                                            field.id,
                                                                            optionIndex
                                                                        )
                                                                    }
                                                                    className="px-3 text-red-500 hover:text-red-700"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        ))
                    )}

                    {/* Save */}
                    {fields.length > 0 && (
                        <div className="flex justify-end pt-4 pb-12">
                            <button
                                type="submit"
                                className="px-7 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
                            >
                                Save Fields
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}