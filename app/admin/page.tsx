"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    getRegistrations,
    getSupplierAccessRequests,
    getSupplierInvitations,
} from "@/lib/storage";

import { Registration } from "@/types/registration";

interface RegistrationSummary {
    registration: Registration;
    invitationCount: number;
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

export default function AdminDashboard() {
    const router = useRouter();

    const [summaries, setSummaries] =
        useState<RegistrationSummary[]>([]);

    const [copiedId, setCopiedId] = useState("");

    function loadDashboard() {
        const registrations = getRegistrations();

        setSummaries(
            registrations.map((registration) => ({
                registration,
                invitationCount:
                    getSupplierInvitations(
                        registration.id
                    ).length,
                pendingRequestCount:
                    getSupplierAccessRequests(
                        registration.id
                    ).filter(
                        (request) =>
                            request.status === "pending"
                    ).length,
            }))
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
        <main className="min-h-screen bg-[#eef3f7] text-slate-950">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <aside className="w-full border-b border-slate-200 bg-[#0b1f33] text-white lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r lg:border-slate-800">
                    <div className="flex h-full flex-col p-5 sm:p-7">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-7">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-black text-[#0b1f33] shadow-lg shadow-cyan-950/30">
                                SV
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                                    Supplier Validation
                                </p>

                                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                                    Admin Console
                                </h1>
                            </div>
                        </div>

                        <nav className="mt-8 grid gap-2 sm:grid-cols-3 lg:block">
                            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Navigation
                            </p>

                            <button
                                type="button"
                                className="flex w-full items-center gap-3 rounded-xl bg-cyan-400 px-4 py-3 text-left text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20"
                            >
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
                                className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
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
                                className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
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

                <section className="flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
                    <div className="mx-auto max-w-7xl">
                        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:flex lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                    Admin workspace / Overview
                                </p>

                                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                                    Good morning, Admin
                                </h2>

                                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                                    Keep supplier onboarding moving with a clear view of every registration, invitation, and approval waiting for your attention.
                                </p>
                            </div>

                            <div className="mt-6 flex gap-3 lg:mt-0">
                                <button
                                    type="button"
                                    onClick={loadDashboard}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                                >
                                    Refresh
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            "/admin/registrations/new"
                                        )
                                    }
                                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                >
                                    New Registration
                                </button>
                            </div>
                        </header>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 border-t-4 border-t-slate-950 bg-white p-5 shadow-sm">
                                <p className="text-sm font-medium text-slate-500">
                                    Total registrations
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-slate-950">
                                    {summaries.length}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 border-t-4 border-t-emerald-500 bg-emerald-50 p-5 shadow-sm">
                                <p className="text-sm font-medium text-emerald-800">
                                    Active now
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-emerald-950">
                                    {activeCount}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-cyan-200 border-t-4 border-t-cyan-500 bg-cyan-50 p-5 shadow-sm">
                                <p className="text-sm font-medium text-cyan-800">
                                    Pending approvals
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-cyan-950">
                                    {pendingRequestCount}
                                </p>
                            </div>
                        </div>

                        <section id="registrations" className="mt-8">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                                        Registration pipeline
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Choose a workflow to continue managing suppliers.
                                    </p>
                                </div>

                                <span className="text-sm font-medium text-slate-500">
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
                                <div className="grid gap-5 xl:grid-cols-2">
                                    {summaries.map(
                                        ({
                                            registration,
                                            invitationCount,
                                            pendingRequestCount: pendingCount,
                                        }) => {
                                            const state =
                                                getRegistrationState(
                                                    registration
                                                );

                                            return (
                                                <article
                                                    key={registration.id}
                                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                                >
                                                    <div className="border-b border-slate-100 p-6">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                                                                        {registration.registrationType}
                                                                    </span>
                                                                    <span
                                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${state === "Active"
                                                                            ? "bg-emerald-100 text-emerald-800"
                                                                            : state === "Upcoming"
                                                                                ? "bg-cyan-100 text-cyan-800"
                                                                                : "bg-slate-100 text-slate-600"
                                                                            }`}
                                                                    >
                                                                        {state}
                                                                    </span>
                                                                </div>

                                                                <h4 className="mt-4 text-xl font-semibold text-slate-950">
                                                                    {registration.name}
                                                                </h4>

                                                                <p className="mt-1 text-sm text-slate-500">
                                                                    {registration.supplierCategory} · {registration.startDate} to {registration.endDate}
                                                                </p>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    copyRegistrationLink(
                                                                        registration
                                                                    )
                                                                }
                                                                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                                                            >
                                                                {copiedId ===
                                                                    registration.id
                                                                    ? "Copied"
                                                                    : "Copy link"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70">
                                                        <div className="p-4">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                Basic fields
                                                            </p>
                                                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                                                {registration.requiredFields.length}
                                                            </p>
                                                        </div>

                                                        <div className="p-4">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                Invited
                                                            </p>
                                                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                                                {invitationCount}
                                                            </p>
                                                        </div>

                                                        <div className="p-4">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                Pending
                                                            </p>
                                                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                                                {pendingCount}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-3 p-5">
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
                                                                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
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
                                                                    className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
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