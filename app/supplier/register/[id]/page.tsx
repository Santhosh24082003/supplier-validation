"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import { useParams, useRouter } from "next/navigation";

import {
    getRegistrations,
    getSupplierInvitations,
    updateSupplierInvitation,
    getSupplierAccessRequests,
    saveSupplierAccessRequest,
} from "@/lib/storage";

import { Registration } from "@/types/registration";

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

interface SavedSupplierRegistration {
    email?: string;
    companyName?: string;
    basicInformation?: Record<string, string>;
    values?: Record<string, string>;
}

const basicCompanyInformation: Record<
    string,
    { label: string; type: "text" | "email" | "tel" }
> = {
    companyName: {
        label: "Company Name",
        type: "text",
    },
    companyEmail: {
        label: "Company Email",
        type: "email",
    },
    phone: {
        label: "Phone Number",
        type: "tel",
    },
    address: {
        label: "Company Address",
        type: "text",
    },
    country: {
        label: "Country",
        type: "text",
    },
    taxId: {
        label: "Tax / GST Number",
        type: "text",
    },
};

function isValidGstNumber(value: string) {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        value.trim().toUpperCase()
    );
}

export default function SupplierRegistrationPage() {
    const params = useParams();

    const router = useRouter();

    const id = params.id as string;

    const [registration, setRegistration] =
        useState<Registration | null>(null);

    const [fields, setFields] =
        useState<DynamicField[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [email, setEmail] =
        useState("");

    const [accessCode, setAccessCode] =
        useState("");

    const [companyName, setCompanyName] =
        useState("");

    const [accessGranted, setAccessGranted] =
        useState(false);

    const [requestStatus, setRequestStatus] =
        useState<
            "none" |
            "pending" |
            "approved" |
            "rejected"
        >("none");

    const [error, setError] =
        useState("");

    const [values, setValues] =
        useState<Record<string, string>>({});

    const [basicInformation, setBasicInformation] =
        useState<Record<string, string>>({});

    const [gstError, setGstError] =
        useState("");

    useEffect(() => {
        const registrations =
            getRegistrations();

        const currentRegistration =
            registrations.find(
                (item) => item.id === id
            );

        if (!currentRegistration) {
            setLoading(false);
            return;
        }

        setRegistration(
            currentRegistration
        );

        const savedFields =
            localStorage.getItem(
                `registration-fields-${id}`
            );

        if (savedFields) {
            setFields(
                JSON.parse(savedFields)
            );
        }

        const savedRegistration = localStorage.getItem(
            `supplier-registration-${id}`
        );

        if (savedRegistration) {
            const savedData = JSON.parse(
                savedRegistration
            ) as SavedSupplierRegistration;

            setEmail(savedData.email || "");
            setCompanyName(savedData.companyName || "");
            setBasicInformation(
                savedData.basicInformation || {}
            );
            setValues(savedData.values || {});
            setAccessGranted(true);
        }

        if (
            currentRegistration.registrationType ===
            "open"
        ) {
            setAccessGranted(true);
        }

        setLoading(false);
    }, [id]);

    function handleClosedAccess(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        const cleanEmail =
            email.trim().toLowerCase();

        const cleanAccessCode =
            accessCode.trim();

        if (!cleanEmail) {
            setError(
                "Please enter your email address."
            );

            return;
        }

        if (!/^\d{6}$/.test(cleanAccessCode)) {
            setError(
                "Enter the six-digit invitation access code."
            );

            return;
        }

        const invitations =
            getSupplierInvitations(id);

        const invitation =
            invitations.find(
                (item) =>
                    item.email.toLowerCase() ===
                    cleanEmail &&
                    item.accessCode === cleanAccessCode &&
                    item.status === "invited"
            );

        if (!invitation) {
            setError(
                "This email address is not invited to this registration."
            );

            return;
        }

        updateSupplierInvitation(
            id,
            invitation.id,
            "used"
        );

        setAccessGranted(true);

        setBasicInformation((current) => ({
            ...current,
            companyEmail: cleanEmail,
        }));
    }

    function handleHybridRequest(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        const cleanEmail =
            email.trim().toLowerCase();

        const cleanCompany =
            companyName.trim();

        if (!cleanEmail) {
            setError(
                "Please enter your email address."
            );

            return;
        }

        if (!cleanEmail.includes("@")) {
            setError(
                "Please enter a valid email address."
            );

            return;
        }

        if (!cleanCompany) {
            setError(
                "Please enter your company name."
            );

            return;
        }

        const existingRequests =
            getSupplierAccessRequests(id);

        const existingRequest =
            existingRequests.find(
                (request) =>
                    request.email.toLowerCase() ===
                    cleanEmail
            );

        if (existingRequest) {
            setRequestStatus(
                existingRequest.status
            );

            return;
        }

        const request = {
            id: crypto.randomUUID(),

            registrationId: id,

            email: cleanEmail,

            companyName: cleanCompany,

            status: "pending" as const,

            createdAt:
                new Date().toISOString(),
        };

        saveSupplierAccessRequest(
            request
        );

        setRequestStatus("pending");
    }

    function updateValue(
        fieldId: string,
        value: string
    ) {
        setValues((current) => ({
            ...current,

            [fieldId]: value,
        }));
    }

    function handleRegistrationSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        for (const fieldKey of registration?.requiredFields || []) {
            const field = basicCompanyInformation[fieldKey];

            if (field && !basicInformation[fieldKey]?.trim()) {
                setError(`${field.label} is required.`);

                return;
            }
        }

        if (
            registration?.requiredFields.includes("taxId") &&
            !isValidGstNumber(basicInformation.taxId || "")
        ) {
            setGstError(
                "Enter a valid 15-character GSTIN, for example 27ABCDE1234F1Z5."
            );
            setError("Please enter a valid GST number.");
            return;
        }

        for (const field of fields) {
            if (
                field.required &&
                !values[field.id]?.trim()
            ) {
                setError(
                    `${field.label} is required.`
                );

                return;
            }
        }

        localStorage.setItem(
            `supplier-registration-${id}`,
            JSON.stringify({
                registrationId: id,
                email:
                    basicInformation.companyEmail ||
                    email,
                companyName:
                    basicInformation.companyName ||
                    companyName,
                basicInformation,
                values,
                submittedAt:
                    new Date().toISOString(),
            })
        );

        router.push(
            `/supplier/register/${id}/documents`
        );
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-600">
                    Loading registration...
                </p>
            </main>
        );
    }

    if (!registration) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <h1 className="text-xl font-bold">
                        Registration not found
                    </h1>
                </div>
            </main>
        );
    }

    /* -------------------- */
    /* CLOSED ACCESS        */
    /* -------------------- */

    if (
        registration.registrationType ===
        "closed" &&
        !accessGranted
    ) {
        return (
            <main className="min-h-screen bg-slate-50 px-6 py-12">
                <div className="mx-auto max-w-lg">

                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

                        <p className="text-sm font-semibold text-indigo-600">
                            Closed Registration
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900">
                            Supplier Access
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            This registration is invitation-only.
                            Enter the invited email and the
                            six-digit access code provided by
                            the administrator.
                        </p>

                        <form
                            onSubmit={
                                handleClosedAccess
                            }
                            className="mt-6 space-y-4"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="supplier@company.com"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Invitation Access Code
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={accessCode}
                                    onChange={(event) =>
                                        setAccessCode(
                                            event.target.value.replace(/\D/g, "")
                                        )
                                    }
                                    placeholder="123456"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 tracking-[0.3em] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
                            >
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        );
    }

    /* -------------------- */
    /* HYBRID ACCESS        */
    /* -------------------- */

    if (
        registration.registrationType ===
        "hybrid" &&
        !accessGranted &&
        requestStatus !== "approved"
    ) {
        return (
            <main className="min-h-screen bg-slate-50 px-6 py-12">
                <div className="mx-auto max-w-lg">

                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

                        <p className="text-sm font-semibold text-indigo-600">
                            Hybrid Registration
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900">
                            Request Registration Access
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Submit your company details
                            below. An administrator must
                            approve your request before you
                            can continue.
                        </p>

                        {requestStatus ===
                            "pending" && (
                                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="font-semibold text-amber-800">
                                        Request Pending
                                    </p>

                                    <p className="mt-1 text-sm text-amber-700">
                                        Your access request is
                                        waiting for administrator
                                        approval.
                                    </p>
                                </div>
                            )}

                        {requestStatus ===
                            "rejected" && (
                                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <p className="font-semibold text-red-800">
                                        Request Rejected
                                    </p>

                                    <p className="mt-1 text-sm text-red-700">
                                        Your request was not
                                        approved by the
                                        administrator.
                                    </p>
                                </div>
                            )}

                        {requestStatus === "none" && (
                            <form
                                onSubmit={
                                    handleHybridRequest
                                }
                                className="mt-6 space-y-4"
                            >
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Company Name
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            companyName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCompanyName(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="ABC Industries"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(
                                            event
                                        ) =>
                                            setEmail(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="supplier@company.com"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-600">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
                                >
                                    Request Access
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    /* -------------------- */
    /* REGISTRATION FORM    */
    /* -------------------- */

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">
            <div className="mx-auto max-w-4xl">

                <div className="mb-8">
                    <p className="text-sm font-semibold text-indigo-600">
                        Supplier Registration
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900">
                        {registration.name}
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Complete the registration form
                        below.
                    </p>
                </div>

                <form
                    onSubmit={
                        handleRegistrationSubmit
                    }
                    className="space-y-6"
                >

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-semibold text-slate-900">
                            Basic Company Information
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Provide the company details required for this registration.
                        </p>

                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                            {registration.requiredFields.map(
                                (fieldKey) => {
                                    const field =
                                        basicCompanyInformation[
                                        fieldKey
                                        ];

                                    if (!field) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={fieldKey}
                                            className={
                                                fieldKey ===
                                                    "address"
                                                    ? "md:col-span-2"
                                                    : ""
                                            }
                                        >
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {field.label}
                                            </label>

                                            <input
                                                type={field.type}
                                                value={
                                                    basicInformation[
                                                    fieldKey
                                                    ] || ""
                                                }
                                                maxLength={
                                                    fieldKey === "taxId"
                                                        ? 15
                                                        : undefined
                                                }
                                                placeholder={
                                                    fieldKey === "taxId"
                                                        ? "27ABCDE1234F1Z5"
                                                        : undefined
                                                }
                                                onChange={(event) => {
                                                    const value =
                                                        fieldKey === "taxId"
                                                            ? event.target.value
                                                                .toUpperCase()
                                                                .replace(
                                                                    /[^0-9A-Z]/g,
                                                                    ""
                                                                )
                                                            : event.target.value;

                                                    setBasicInformation(
                                                        (current) => ({
                                                            ...current,
                                                            [fieldKey]: value,
                                                        })
                                                    );

                                                    if (
                                                        fieldKey === "taxId"
                                                    ) {
                                                        setGstError(
                                                            value &&
                                                                !isValidGstNumber(
                                                                    value
                                                                )
                                                                ? "GSTIN must be 15 characters, for example 27ABCDE1234F1Z5."
                                                                : ""
                                                        );
                                                    }
                                                }}
                                                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                            />

                                            {fieldKey === "taxId" && (
                                                <p
                                                    className={`mt-2 text-xs ${gstError
                                                        ? "text-red-600"
                                                        : "text-slate-500"
                                                        }`}
                                                >
                                                    {gstError ||
                                                        "Format example: 27ABCDE1234F1Z5"}
                                                </p>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>

                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-semibold text-slate-900">
                            Supplier Information
                        </h2>

                        <div className="mt-6 space-y-5">

                            {fields.map(
                                (field) => (
                                    <div
                                        key={
                                            field.id
                                        }
                                    >
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {
                                                field.label
                                            }

                                            {field.required && (
                                                <span className="ml-1 text-red-500">
                                                    *
                                                </span>
                                            )}
                                        </label>

                                        {field.type ===
                                            "textarea" && (
                                                <textarea
                                                    value={
                                                        values[
                                                        field
                                                            .id
                                                        ] || ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateValue(
                                                            field.id,
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    rows={5}
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                                />
                                            )}

                                        {field.type ===
                                            "dropdown" && (
                                                <select
                                                    value={
                                                        values[
                                                        field
                                                            .id
                                                        ] || ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateValue(
                                                            field.id,
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                                >
                                                    <option value="">
                                                        Select{" "}
                                                        {
                                                            field.label
                                                        }
                                                    </option>

                                                    {field.options.map(
                                                        (
                                                            option
                                                        ) => (
                                                            <option
                                                                key={
                                                                    option
                                                                }
                                                                value={
                                                                    option
                                                                }
                                                            >
                                                                {
                                                                    option
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            )}

                                        {field.type !==
                                            "textarea" &&
                                            field.type !==
                                            "dropdown" && (
                                                <input
                                                    type={
                                                        field.type
                                                    }
                                                    value={
                                                        values[
                                                        field
                                                            .id
                                                        ] ||
                                                        ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateValue(
                                                            field.id,
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                                />
                                            )}
                                    </div>
                                )
                            )}

                        </div>

                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="rounded-xl bg-indigo-600 px-7 py-3 font-semibold text-white hover:bg-indigo-700"
                        >
                            Continue
                        </button>
                    </div>

                </form>
            </div>
        </main>
    );
}