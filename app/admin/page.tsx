"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    getRegistrations,
    getSupplierAccessRequests,
} from "@/lib/storage";

import { Registration } from "@/types/registration";

interface RegistrationSummary {
    registration: Registration;
    totalFieldCount: number;
    pendingRequestCount: number;
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

    const [summaries, setSummaries] =
        useState<RegistrationSummary[]>([]);

    const [copiedId, setCopiedId] = useState("");

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

                return {
                    registration,
                    totalFieldCount:
                        registration.requiredFields.length +
                        dynamicFieldCount,
                    pendingRequestCount:
                        getSupplierAccessRequests(
                            registration.id
                        ).filter(
                            (request) =>
                                request.status === "pending"
                        ).length,
                };
            })
        );
    }

    useEffect(() => {
        const loadTimer = window.setTimeout(
            loadDashboard,
            0
        );

        return () => window.clearTimeout(loadTimer);
    }, []);

    async function copyRegistrationLink(
        registration: Registration
    ) {
        await navigator.clipboard.writeText(
            `${window.location.origin}${registration.registrationLink}`
        );

        setCopiedId(registration.id);

        setTimeout(() => setCopiedId(""), 2000);
    }

    const activeCount = summaries.filter(
        ({ registration }) =>
            getRegistrationState(registration) === "Active"
    ).length;

    const pendingRequestCount = summaries.reduce(
        (total, summary) =>
            total + summary.pendingRequestCount,
        0
    );

    return (
        <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
            <div className="flex min-h-screen flex-col lg:flex-row">
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

                        <nav className="mt-8 grid gap-2 sm:grid-cols-3 lg:block">
                            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">
                                Navigation
                            </p>

                            <button
                                type="button"
                                aria-current="page"
                                className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white shadow-none"
                            >
                                <span aria-hidden="true" className="text-base text-blue-200">▦</span>
                                Dashboard
                            </button>

                            {/* <button
                                type="button"
                                onClick={() =>
                                    document
                                        .getElementById("registrations")
                                        ?.scrollIntoView({
                                            behavior: "smooth",
                                        })
                                }
                                className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                            >
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/15 text-xs text-slate-400">
                                    02
                                </span>
                                Registrations
                            </button> */}

                            <button
                                type="button"
                                onClick={() =>
                                    router.push(
                                        "/admin/registrations/new"
                                    )
                                }
                                className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-blue-100 transition hover:bg-white/10 hover:text-white"
                            >
                                <span aria-hidden="true" className="text-lg leading-none text-blue-200">+</span>
                                Create Registration
                            </button>
                        </nav>

                        {/* <button
                            type="button"
                            onClick={() => router.push("/")}
                            className="mt-8 flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white lg:mt-auto"
                        >
                            <span>View Supplier Portal</span>
                            <span aria-hidden="true">↗</span>
                        </button> */}
                    </div>
                </aside>

                <section className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
                    <div className="mx-auto max-w-7xl">
                        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                    Admin Workspace
                                </p>

                                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                    Overview
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    Overview and supplier registration activity
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
                                    <span aria-hidden="true" className="text-lg leading-none">+</span>
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
                                    <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-700">
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
                                    <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-700">
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
                                    <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-700">
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
                                        Manage and monitor supplier onboarding workflows.
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
                                        Create your first registration to configure supplier fields and begin onboarding.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.push(
                                                "/admin/registrations/new"
                                            )
                                        }
                                        className="mt-6 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
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
                                                                        {registration.registrationType}
                                                                    </span>
                                                                    <span
                                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${state === "Active"
                                                                            ? "bg-emerald-100 text-emerald-800"
                                                                            : state === "Upcoming"
                                                                                ? "bg-cyan-100 text-cyan-800"
                                                                                : "bg-slate-100 text-slate-600"
                                                                            }`}
                                                                    >
                                                                        {state}
                                                                    </span>
                                                                    <span
                                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getApprovalStatus(registration) === "approved"
                                                                            ? "bg-emerald-100 text-emerald-800"
                                                                            : getApprovalStatus(registration) === "rejected"
                                                                                ? "bg-red-100 text-red-800"
                                                                                : "bg-slate-100 text-slate-600"
                                                                            }`}
                                                                    >
                                                                        {getApprovalStatus(registration)}
                                                                    </span>
                                                                </div>

                                                                <h4 className="mt-4 truncate text-lg font-semibold text-slate-950 sm:text-xl">
                                                                    {registration.name}
                                                                </h4>

                                                                <p className="mt-1 text-sm text-slate-500">
                                                                    {registration.supplierCategory} <span aria-hidden="true">·</span> {registration.startDate} – {registration.endDate}
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
                                                                <span aria-hidden="true" className="mr-1">⧉</span>
                                                                {copiedId ===
                                                                    registration.id
                                                                    ? "Copied"
                                                                    : "Copy link"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 border-b border-slate-100 bg-slate-50/60">
                                                        <div className="p-4">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                Total fields
                                                            </p>
                                                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                                                {totalFieldCount}
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
                                                            Configure fields
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
                                                            View validation
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
                                                                    Manage invitations
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
                                                                    Review requests
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
                    </div>
                </section>
            </div>
        </main>
    );
}