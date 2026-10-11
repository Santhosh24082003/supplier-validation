"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    getRegistrations,
    getSupplierAccessRequests,
    getRegistrationDynamicFiles,
    getSupplierItems,
} from "@/lib/storage";

import { Registration, SupplyingItem } from "@/types/registration";
import {
    defaultRegistrationRules,
    getGlobalRules,
    saveGlobalRules,
    RegistrationRule,
} from "@/lib/rules";

interface RegistrationSummary {
    registration: Registration;
    totalFieldCount: number;
    dynamicFileCount: number;
    itemsCount: number;
    pendingRequestCount: number;
}

interface OnboardedSupplier {
    registrationId: string;
    registrationName: string;
    registrationType: "open" | "closed" | "hybrid";
    supplierCategory: string;
    companyName: string;
    email: string;
    phone: string;
    taxId: string;
    address: string;
    expectedPurchaseValue: string;
    submittedAt: string;
    documentCount: number;
    approvalSource: "registration" | "hybrid_request";
    items?: SupplyingItem[];
}

function getRegistrationState(registration: Registration) {
    const today = new Date().toISOString().slice(0, 10);

    if (today < registration.startDate) {
        return "Upcoming";
    }

    if (today > registration.endDate) {
        return "Closed";
    }

    return "Active";
}

function getApprovalStatus(registration: Registration) {
    return registration.approvalStatus || "pending";
}

export default function AdminDashboard() {
    const router = useRouter();

    const [currentView, setCurrentView] = useState<
        "dashboard" | "onboarded-suppliers" | "rules"
    >("dashboard");

    const [summaries, setSummaries] = useState<RegistrationSummary[]>([]);
    const [copiedId, setCopiedId] = useState("");

    // Onboarded Suppliers state
    const [onboardedSuppliers, setOnboardedSuppliers] = useState<
        OnboardedSupplier[]
    >([]);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] =
        useState("all");

    // Global Rules state
    const [globalRules, setGlobalRules] = useState<RegistrationRule[]>([]);
    const [rulesSavedToast, setRulesSavedToast] = useState(false);

    function loadDashboard() {
        const registrations = getRegistrations();

        setSummaries(
            registrations.map((registration) => {
                const savedFields = localStorage.getItem(
                    `registration-fields-${registration.id}`
                );
                const dynamicFieldCount = savedFields
                    ? JSON.parse(savedFields).length
                    : 0;
                const dynamicFileCount = getRegistrationDynamicFiles(
                    registration.id
                ).length;
                const itemsCount = getSupplierItems(registration.id).length;

                return {
                    registration,
                    totalFieldCount:
                        registration.requiredFields.length + dynamicFieldCount,
                    dynamicFileCount,
                    itemsCount,
                    pendingRequestCount: getSupplierAccessRequests(
                        registration.id
                    ).filter((request) => request.status === "pending").length,
                };
            })
        );
    }

    function loadOnboardedSuppliers() {
        const registrations = getRegistrations();
        const suppliers: OnboardedSupplier[] = [];
        const seenKeys = new Set<string>();

        registrations.forEach((reg) => {
            // Check 1: Registration approved by admin
            if (reg.approvalStatus === "approved") {
                let submission: {
                    email?: string;
                    companyName?: string;
                    basicInformation?: Record<string, string>;
                    values?: Record<string, string>;
                    submittedAt?: string;
                } | null = null;

                const savedRaw = localStorage.getItem(
                    `supplier-registration-${reg.id}`
                );
                if (savedRaw) {
                    try {
                        submission = JSON.parse(savedRaw);
                    } catch {}
                }

                let documentsCount = 0;
                const savedDocsRaw = localStorage.getItem(
                    `supplier-documents-${reg.id}`
                );
                if (savedDocsRaw) {
                    try {
                        documentsCount = JSON.parse(savedDocsRaw).length;
                    } catch {}
                }

                const companyName =
                    submission?.companyName ||
                    submission?.basicInformation?.companyName ||
                    reg.name;
                const email =
                    submission?.email ||
                    submission?.basicInformation?.companyEmail ||
                    "Not provided";
                const phone =
                    submission?.basicInformation?.phone || "Not provided";
                const taxId =
                    submission?.basicInformation?.taxId || "Not provided";
                const address =
                    submission?.basicInformation?.address || "Not provided";
                const expectedPurchaseValue =
                    submission?.basicInformation?.expectedPurchaseValue || "";
                const submittedAt = submission?.submittedAt || reg.createdAt;
                const items = getSupplierItems(reg.id);

                seenKeys.add(`${reg.id}-${companyName}`);
                suppliers.push({
                    registrationId: reg.id,
                    registrationName: reg.name,
                    registrationType: reg.registrationType,
                    supplierCategory: reg.supplierCategory,
                    companyName,
                    email,
                    phone,
                    taxId,
                    address,
                    expectedPurchaseValue,
                    submittedAt,
                    documentCount: documentsCount,
                    approvalSource: "registration",
                    items,
                });
            }

            // Check 2: Hybrid access requests approved by admin
            const accessRequests = getSupplierAccessRequests(reg.id);
            const approvedRequests = accessRequests.filter(
                (request) => request.status === "approved"
            );
            approvedRequests.forEach((request) => {
                const key = `${reg.id}-${request.companyName}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    suppliers.push({
                        registrationId: reg.id,
                        registrationName: reg.name,
                        registrationType: reg.registrationType,
                        supplierCategory: reg.supplierCategory,
                        companyName: request.companyName,
                        email: request.email,
                        phone: "Not provided",
                        taxId: "Not provided",
                        address: "Not provided",
                        expectedPurchaseValue: "",
                        submittedAt: request.createdAt,
                        documentCount: 0,
                        approvalSource: "hybrid_request",
                        items: getSupplierItems(reg.id),
                    });
                }
            });
        });

        setOnboardedSuppliers(suppliers);
    }

    function loadRules() {
        setGlobalRules(getGlobalRules());
    }

    useEffect(() => {
        loadDashboard();
        loadOnboardedSuppliers();
        loadRules();
    }, []);

    useEffect(() => {
        if (currentView === "dashboard") {
            loadDashboard();
        } else if (currentView === "onboarded-suppliers") {
            loadOnboardedSuppliers();
        } else if (currentView === "rules") {
            loadRules();
        }
    }, [currentView]);

    async function copyRegistrationLink(registration: Registration) {
        await navigator.clipboard.writeText(
            `${window.location.origin}${registration.registrationLink}`
        );

        setCopiedId(registration.id);

        setTimeout(() => setCopiedId(""), 2000);
    }

    function handleToggleRule(ruleId: RegistrationRule["id"]) {
        const updated = globalRules.map((rule) =>
            rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
        );
        setGlobalRules(updated);
        saveGlobalRules(updated);
        setRulesSavedToast(true);
        setTimeout(() => setRulesSavedToast(false), 3000);
    }

    function handleThresholdChange(
        ruleId: RegistrationRule["id"],
        threshold: number
    ) {
        const updated = globalRules.map((rule) =>
            rule.id === ruleId ? { ...rule, threshold } : rule
        );
        setGlobalRules(updated);
        saveGlobalRules(updated);
        setRulesSavedToast(true);
        setTimeout(() => setRulesSavedToast(false), 3000);
    }

    function handleSelectAllRules(enable: boolean) {
        const updated = globalRules.map((rule) => ({
            ...rule,
            enabled: enable,
        }));
        setGlobalRules(updated);
        saveGlobalRules(updated);
        setRulesSavedToast(true);
        setTimeout(() => setRulesSavedToast(false), 3000);
    }

    function handleResetDefaultRules() {
        setGlobalRules(defaultRegistrationRules);
        saveGlobalRules(defaultRegistrationRules);
        setRulesSavedToast(true);
        setTimeout(() => setRulesSavedToast(false), 3000);
    }

    const activeCount = summaries.filter(
        ({ registration }) => getRegistrationState(registration) === "Active"
    ).length;

    const pendingRequestCount = summaries.reduce(
        (total, summary) => total + summary.pendingRequestCount,
        0
    );

    const filteredOnboardedSuppliers = onboardedSuppliers.filter((supplier) => {
        const matchesCategory =
            selectedCategoryFilter === "all" ||
            supplier.supplierCategory.toLowerCase() ===
                selectedCategoryFilter.toLowerCase();

        const query = supplierSearchQuery.trim().toLowerCase();
        const matchesQuery =
            !query ||
            supplier.companyName.toLowerCase().includes(query) ||
            supplier.email.toLowerCase().includes(query) ||
            supplier.registrationName.toLowerCase().includes(query) ||
            supplier.taxId.toLowerCase().includes(query);

        return matchesCategory && matchesQuery;
    });

    const activeRulesCount = globalRules.filter((r) => r.enabled).length;

    return (
        <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
            <div className="flex min-h-screen flex-col lg:flex-row">
                {/* Sidebar Navigation */}
                <aside className="w-full border-b border-slate-800 bg-slate-800 text-white lg:sticky lg:top-0 lg:h-screen lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-slate-900">
                    <div className="flex h-full flex-col p-5 sm:p-7">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-base font-black text-blue-800 shadow-sm">
                                SV
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100">
                                    Supplier Validation
                                </p>

                                <h1 className="mt-1 text-lg font-semibold tracking-tight">
                                    Admin Console
                                </h1>
                            </div>
                        </div>

                        <nav className="mt-8 grid gap-2 sm:grid-cols-2 lg:block">
                            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">
                                Navigation
                            </p>

                            {/* 1. Dashboard Option */}
                            <button
                                type="button"
                                onClick={() => setCurrentView("dashboard")}
                                aria-current={
                                    currentView === "dashboard"
                                        ? "page"
                                        : undefined
                                }
                                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                                    currentView === "dashboard"
                                        ? "border border-white/10 bg-white/10 text-white shadow-none"
                                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-base text-blue-200"
                                >
                                    ▦
                                </span>
                                Dashboard
                            </button>

                            {/* 2. Onboarded Supplier Option */}
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentView("onboarded-suppliers")
                                }
                                aria-current={
                                    currentView === "onboarded-suppliers"
                                        ? "page"
                                        : undefined
                                }
                                className={`mt-1 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                                    currentView === "onboarded-suppliers"
                                        ? "border border-white/10 bg-white/10 text-white shadow-none"
                                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="text-base text-emerald-300"
                                    >
                                        ✓
                                    </span>
                                    <span>Onboarded Supplier</span>
                                </div>
                                {onboardedSuppliers.length > 0 && (
                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                        {onboardedSuppliers.length}
                                    </span>
                                )}
                            </button>

                            {/* 3. Rules Option */}
                            <button
                                type="button"
                                onClick={() => setCurrentView("rules")}
                                aria-current={
                                    currentView === "rules" ? "page" : undefined
                                }
                                className={`mt-1 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                                    currentView === "rules"
                                        ? "border border-white/10 bg-white/10 text-white shadow-none"
                                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="text-base text-blue-200"
                                    >
                                        ⚖
                                    </span>
                                    <span>Rules</span>
                                </div>
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-blue-100">
                                    {activeRulesCount}/{globalRules.length || 9}
                                </span>
                            </button>

                            {/* 4. Create Registration Option */}
                            <button
                                type="button"
                                onClick={() =>
                                    router.push("/admin/registrations/new")
                                }
                                className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-blue-100 transition hover:bg-white/10 hover:text-white"
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-lg leading-none text-blue-200"
                                >
                                    +
                                </span>
                                Create Registration
                            </button>
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <section className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
                    <div className="mx-auto max-w-7xl">
                        {/* ======================================================== */}
                        {/* VIEW 1: DASHBOARD OVERVIEW & REGISTRATION PIPELINES      */}
                        {/* ======================================================== */}
                        {currentView === "dashboard" && (
                            <>
                                <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                            Admin Workspace
                                        </p>

                                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                            Overview
                                        </h2>

                                        <p className="mt-2 text-sm text-slate-500">
                                            Overview and supplier registration
                                            activity
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(
                                                    "/admin/registrations/new"
                                                )
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="text-lg leading-none"
                                            >
                                                +
                                            </span>
                                            Create Registration
                                        </button>
                                    </div>
                                </header>

                                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">
                                                    Total registrations
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                                                    {summaries.length}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    All registrations
                                                </p>
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-700"
                                            >
                                                ▦
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">
                                                    Active now
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                                                    {activeCount}
                                                </p>
                                                <p className="mt-1 text-xs text-emerald-700">
                                                    Currently accepting suppliers
                                                </p>
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-700"
                                            >
                                                ✓
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">
                                                    Pending approvals
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                                                    {pendingRequestCount}
                                                </p>
                                                <p className="mt-1 text-xs text-amber-700">
                                                    Requires your attention
                                                </p>
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-700"
                                            >
                                                !
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <section id="registrations" className="mt-9">
                                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h3 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                                                Registration Pipelines
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Manage and monitor supplier
                                                onboarding workflows.
                                            </p>
                                        </div>

                                        <span className="text-sm text-slate-500">
                                            {summaries.length} total
                                        </span>
                                    </div>

                                    {summaries.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                                            <h4 className="text-lg font-semibold text-slate-950">
                                                No registrations yet
                                            </h4>

                                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                                Create your first registration to
                                                configure supplier fields and
                                                begin onboarding.
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(
                                                        "/admin/registrations/new"
                                                    )
                                                }
                                                className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                                            >
                                                Create Registration
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 xl:grid-cols-2">
                                            {summaries.map(
                                                ({
                                                    registration,
                                                    totalFieldCount,
                                                    dynamicFileCount,
                                                    itemsCount,
                                                }) => {
                                                    const state =
                                                        getRegistrationState(
                                                            registration
                                                        );

                                                    return (
                                                        <article
                                                            key={registration.id}
                                                            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                                                        >
                                                            <div className="border-b border-slate-100 p-5 sm:p-6">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="min-w-0">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
                                                                                {
                                                                                    registration.registrationType
                                                                                }
                                                                            </span>
                                                                            <span
                                                                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                                                    state ===
                                                                                    "Active"
                                                                                        ? "bg-emerald-100 text-emerald-800"
                                                                                        : state ===
                                                                                          "Upcoming"
                                                                                        ? "bg-cyan-100 text-cyan-800"
                                                                                        : "bg-slate-100 text-slate-600"
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    state
                                                                                }
                                                                            </span>
                                                                            <span
                                                                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                                                                                    getApprovalStatus(
                                                                                        registration
                                                                                    ) ===
                                                                                    "approved"
                                                                                        ? "bg-emerald-100 text-emerald-800"
                                                                                        : getApprovalStatus(
                                                                                              registration
                                                                                          ) ===
                                                                                          "rejected"
                                                                                        ? "bg-red-100 text-red-800"
                                                                                        : "bg-slate-100 text-slate-600"
                                                                                }`}
                                                                            >
                                                                                {getApprovalStatus(
                                                                                    registration
                                                                                )}
                                                                            </span>
                                                                        </div>

                                                                        <h4 className="mt-4 truncate text-lg font-semibold text-slate-950 sm:text-xl">
                                                                            {
                                                                                registration.name
                                                                            }
                                                                        </h4>

                                                                        <p className="mt-1 text-sm text-slate-500">
                                                                            {
                                                                                registration.supplierCategory
                                                                            }{" "}
                                                                            <span aria-hidden="true">
                                                                                ·
                                                                            </span>{" "}
                                                                            {
                                                                                registration.startDate
                                                                            }{" "}
                                                                            –{" "}
                                                                            {
                                                                                registration.endDate
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            copyRegistrationLink(
                                                                                registration
                                                                            )
                                                                        }
                                                                        aria-label={`Copy link for ${registration.name}`}
                                                                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                                                                    >
                                                                        <span
                                                                            aria-hidden="true"
                                                                            className="mr-1"
                                                                        >
                                                                            ⧉
                                                                        </span>
                                                                        {copiedId ===
                                                                        registration.id
                                                                            ? "Copied"
                                                                            : "Copy link"}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60">
                                                                <div className="p-4">
                                                                    <p className="text-xs font-medium text-slate-500">
                                                                        Form fields
                                                                    </p>
                                                                    <p className="mt-1 text-lg font-semibold text-slate-950">
                                                                        {
                                                                            totalFieldCount
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="p-4">
                                                                    <p className="text-xs font-medium text-slate-500">
                                                                        Dynamic
                                                                        files
                                                                    </p>
                                                                    <p className="mt-1 text-lg font-semibold text-indigo-700">
                                                                        {
                                                                            dynamicFileCount
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="p-4">
                                                                    <p className="text-xs font-medium text-slate-500">
                                                                        Supplied items
                                                                    </p>
                                                                    <p className="mt-1 text-lg font-semibold text-emerald-700">
                                                                        {
                                                                            itemsCount
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-2.5 p-4 sm:p-5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/admin/registrations/${registration.id}/fields`
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                                >
                                                                    Configure
                                                                    fields &amp;
                                                                    files
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/admin/registrations/${registration.id}/validation`
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 transition hover:bg-indigo-100"
                                                                >
                                                                    View
                                                                    validation
                                                                </button>

                                                                {registration.registrationType ===
                                                                    "closed" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/admin/registrations/${registration.id}/invitations`
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                                                                    >
                                                                        Manage
                                                                        invitations
                                                                    </button>
                                                                )}

                                                                {registration.registrationType ===
                                                                    "hybrid" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/admin/registrations/${registration.id}/requests`
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2.5 text-sm font-medium text-cyan-900 transition hover:bg-cyan-100"
                                                                    >
                                                                        Review
                                                                        requests
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </article>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {/* ======================================================== */}
                        {/* VIEW 2: ONBOARDED SUPPLIERS                              */}
                        {/* ======================================================== */}
                        {currentView === "onboarded-suppliers" && (
                            <>
                                <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                            Admin Workspace · Verified
                                        </p>

                                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                            Onboarded Suppliers
                                        </h2>

                                        <p className="mt-2 text-sm text-slate-500">
                                            All suppliers approved by the
                                            administrator across registrations.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCurrentView("dashboard")
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                        >
                                            <span>←</span>
                                            Back to Dashboard
                                        </button>
                                    </div>
                                </header>

                                {/* KPI Metrics */}
                                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">
                                                    Total Onboarded
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                                                    {onboardedSuppliers.length}
                                                </p>
                                                <p className="mt-1 text-xs text-emerald-700">
                                                    Admin approved suppliers
                                                </p>
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-700"
                                            >
                                                ✓
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">
                                                    Active Pipelines Linked
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                                                    {
                                                        new Set(
                                                            onboardedSuppliers.map(
                                                                (s) =>
                                                                    s.registrationId
                                                            )
                                                        ).size
                                                    }
                                                </p>
                                                <p className="mt-1 text-xs text-blue-700">
                                                    Across registrations
                                                </p>
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-700"
                                            >
                                                ▦
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500">
                                                    Verified Documents
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                                                    {onboardedSuppliers.reduce(
                                                        (total, s) =>
                                                            total +
                                                            s.documentCount,
                                                        0
                                                    )}
                                                </p>
                                                <p className="mt-1 text-xs text-indigo-700">
                                                    Uploaded &amp; verified files
                                                </p>
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-lg text-indigo-700"
                                            >
                                                📁
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters and Search */}
                                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <input
                                            type="text"
                                            value={supplierSearchQuery}
                                            onChange={(e) =>
                                                setSupplierSearchQuery(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Search by company name, email, or tax ID..."
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-100"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {[
                                            "all",
                                            "IT",
                                            "Manufacturing",
                                            "Construction",
                                            "Logistics",
                                            "Professional Services",
                                        ].map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedCategoryFilter(
                                                        cat
                                                    )
                                                }
                                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                                                    selectedCategoryFilter.toLowerCase() ===
                                                    cat.toLowerCase()
                                                        ? "bg-blue-700 text-white shadow-xs"
                                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                }`}
                                            >
                                                {cat === "all"
                                                    ? `All Categories (${onboardedSuppliers.length})`
                                                    : cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Suppliers List */}
                                <div className="mt-6">
                                    {filteredOnboardedSuppliers.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
                                                ✓
                                            </div>
                                            <h4 className="mt-4 text-lg font-semibold text-slate-950">
                                                No onboarded suppliers found
                                            </h4>

                                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                                {supplierSearchQuery ||
                                                selectedCategoryFilter !== "all"
                                                    ? "No approved suppliers match your current filter criteria."
                                                    : "When an administrator approves a supplier on the validation page, they will automatically appear here."}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCurrentView("dashboard")
                                                }
                                                className="mt-6 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                                            >
                                                View Registration Pipelines
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 xl:grid-cols-2">
                                            {filteredOnboardedSuppliers.map(
                                                (supplier, idx) => (
                                                    <article
                                                        key={`${supplier.registrationId}-${idx}`}
                                                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                                    >
                                                        <div className="border-b border-slate-100 p-5 sm:p-6">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                                                                            {
                                                                                supplier.supplierCategory
                                                                            }
                                                                        </span>
                                                                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                                                            <span>
                                                                                ✓
                                                                            </span>
                                                                            <span>
                                                                                Approved
                                                                                by
                                                                                Admin
                                                                            </span>
                                                                        </span>
                                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                                                                            {
                                                                                supplier.registrationType
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    <h4 className="mt-3 truncate text-xl font-bold text-slate-950">
                                                                        {
                                                                            supplier.companyName
                                                                        }
                                                                    </h4>

                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        Pipeline:{" "}
                                                                        <span className="font-semibold text-slate-700">
                                                                            {
                                                                                supplier.registrationName
                                                                            }
                                                                        </span>
                                                                    </p>
                                                                </div>

                                                                <div className="text-right shrink-0">
                                                                    <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                                                                        Onboarded
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Details Grid */}
                                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-3">
                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Email
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-900 truncate">
                                                                    {
                                                                        supplier.email
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Phone
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-900">
                                                                    {
                                                                        supplier.phone
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    GST / Tax ID
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-900 font-mono">
                                                                    {
                                                                        supplier.taxId
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Purchase
                                                                    Value
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-900">
                                                                    {supplier.expectedPurchaseValue
                                                                        ? `₹${Number(
                                                                              supplier.expectedPurchaseValue
                                                                          ).toLocaleString(
                                                                              "en-IN"
                                                                          )}`
                                                                        : "N/A"}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Documents
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-indigo-700">
                                                                    {
                                                                        supplier.documentCount
                                                                    }{" "}
                                                                    uploaded
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Date
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-900">
                                                                    {supplier.submittedAt
                                                                        ? new Date(
                                                                              supplier.submittedAt
                                                                          ).toLocaleDateString()
                                                                        : "N/A"}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Supplying Items
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-emerald-700">
                                                                    {supplier.items && supplier.items.length > 0
                                                                        ? `${supplier.items.length} item${supplier.items.length !== 1 ? "s" : ""}`
                                                                        : "0 items"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Supplying Items Preview */}
                                                        {supplier.items && supplier.items.length > 0 && (
                                                            <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-3">
                                                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span>📦</span>
                                                                        <span>Supplying Items &amp; Pricing:</span>
                                                                    </span>
                                                                    <span className="text-slate-500 font-mono text-[11px]">
                                                                        {supplier.items.length} {supplier.items.length === 1 ? "item" : "items"}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                                                    {supplier.items.map((it, i) => (
                                                                        <div
                                                                            key={it.id || i}
                                                                            className="flex items-center justify-between rounded-lg bg-white border border-slate-200/80 px-3 py-1.5 text-xs shadow-2xs"
                                                                        >
                                                                            <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                                                                                {it.name || `Item ${i + 1}`}
                                                                            </span>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                                                                    {it.uom}
                                                                                </span>
                                                                                <span className="font-mono font-bold text-slate-900">
                                                                                    ₹{Number(it.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Action Buttons */}
                                                        <div className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/admin/registrations/${supplier.registrationId}/validation`
                                                                    )
                                                                }
                                                                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 shadow-xs"
                                                            >
                                                                View Validation
                                                                Decision
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/admin/registrations/${supplier.registrationId}/fields`
                                                                    )
                                                                }
                                                                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                Configure
                                                                Fields &amp;
                                                                Files
                                                            </button>
                                                        </div>
                                                    </article>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ======================================================== */}
                        {/* VIEW 3: RULES CONFIGURATION                              */}
                        {/* ======================================================== */}
                        {currentView === "rules" && (
                            <>
                                <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                            Admin Workspace · Rule Configuration
                                        </p>

                                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                            Registration Rules
                                        </h2>

                                        <p className="mt-2 text-sm text-slate-500">
                                            Configure all rules with checkboxes.
                                            Only checked rules will be
                                            applicable to every new registration
                                            creation.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(
                                                    "/admin/registrations/new"
                                                )
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="text-lg leading-none"
                                            >
                                                +
                                            </span>
                                            Create Registration With These Rules
                                        </button>
                                    </div>
                                </header>

                                {/* Notice Banner */}
                                <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/80 p-4 sm:p-5 shadow-xs">
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">ℹ️</span>
                                        <div>
                                            <h4 className="font-semibold text-blue-950 text-sm">
                                                Applicable to Every New
                                                Registration Creation
                                            </h4>
                                            <p className="mt-1 text-xs sm:text-sm text-blue-800 leading-relaxed">
                                                The rules enabled with a
                                                checkbox below represent the
                                                system standard. Only the
                                                checked rules will be activated
                                                and applicable whenever a new
                                                supplier registration pipeline
                                                is created.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Saved Toast Alert */}
                                {rulesSavedToast && (
                                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm flex items-center justify-between transition">
                                        <div className="flex items-center gap-2 font-medium">
                                            <span className="font-bold text-emerald-600">
                                                ✓
                                            </span>
                                            <span>
                                                Rules updated! Only the checked
                                                rules will be applicable to
                                                every new registration creation.
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRulesSavedToast(false)
                                            }
                                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                )}

                                {/* Action Toolbar */}
                                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                            {activeRulesCount} of{" "}
                                            {globalRules.length} Rules Active
                                        </span>
                                        {activeRulesCount <
                                            globalRules.length && (
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                                {globalRules.length -
                                                    activeRulesCount}{" "}
                                                Disabled
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSelectAllRules(true)
                                            }
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                        >
                                            Check All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSelectAllRules(false)
                                            }
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                        >
                                            Uncheck All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetDefaultRules}
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                        >
                                            Reset Defaults
                                        </button>
                                    </div>
                                </div>

                                {/* Rules List */}
                                <div className="mt-6 space-y-3.5">
                                    {globalRules.map((rule) => {
                                        return (
                                            <div
                                                key={rule.id}
                                                className={`rounded-xl border p-5 transition ${
                                                    rule.enabled
                                                        ? "border-blue-400 bg-white shadow-xs ring-1 ring-blue-500/10"
                                                        : "border-slate-200 bg-slate-50/60 opacity-80"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <label className="flex flex-1 cursor-pointer items-start gap-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                rule.enabled
                                                            }
                                                            onChange={() =>
                                                                handleToggleRule(
                                                                    rule.id
                                                                )
                                                            }
                                                            className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-700 accent-blue-700 focus:ring-blue-600 cursor-pointer"
                                                        />

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-base font-bold text-slate-900">
                                                                    {rule.label}
                                                                </span>

                                                                {rule.enabled ? (
                                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                                                        Applicable
                                                                        to New
                                                                        Registrations
                                                                    </span>
                                                                ) : (
                                                                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                                        Disabled
                                                                        (Not
                                                                        Applicable)
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="mt-1 text-sm text-slate-600">
                                                                {
                                                                    rule.description
                                                                }
                                                            </p>
                                                        </div>
                                                    </label>
                                                </div>

                                                {/* Threshold configuration if high-purchase rule */}
                                                {rule.id ===
                                                    "high-purchase-financial-documents" &&
                                                    rule.enabled && (
                                                        <div className="mt-4 ml-9 max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                                                            <label
                                                                htmlFor="globalThreshold"
                                                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                                                            >
                                                                Purchase value
                                                                threshold for
                                                                financials (INR)
                                                            </label>

                                                            <input
                                                                id="globalThreshold"
                                                                type="number"
                                                                min="0"
                                                                value={
                                                                    rule.threshold ||
                                                                    5000000
                                                                }
                                                                onChange={(e) =>
                                                                    handleThresholdChange(
                                                                        rule.id,
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                                            />
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}