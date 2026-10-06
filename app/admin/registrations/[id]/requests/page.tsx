"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
    getSupplierAccessRequests,
    updateSupplierAccessRequest,
} from "@/lib/storage";

import { SupplierAccessRequest } from "@/types/registration";

export default function RequestsPage() {
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;

    const [requests, setRequests] =
        useState<SupplierAccessRequest[]>([]);

    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setRequests(
            getSupplierAccessRequests(id)
        );
    }, [id]);

    async function copyRegistrationLink() {
        const link =
            `${window.location.origin}/supplier/register/${id}`;

        await navigator.clipboard.writeText(link);
        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
    }

    function updateStatus(
        requestId: string,
        status:
            | "approved"
            | "rejected"
    ) {
        updateSupplierAccessRequest(
            id,
            requestId,
            status
        );

        setRequests((current) =>
            current.map((request) =>
                request.id === requestId
                    ? {
                        ...request,
                        status,
                    }
                    : request
            )
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-8">
            <div className="mx-auto max-w-6xl">

                <button
                    onClick={() =>
                        router.push(
                            `/admin/registrations/${id}/fields`
                        )
                    }
                    className="mb-6 text-sm text-slate-500 hover:text-slate-900"
                >
                    ← Back to Registration
                </button>

                <div className="mb-8">
                    <p className="text-sm font-semibold text-indigo-600">
                        Hybrid Registration
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900">
                        Supplier Access Requests
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Review suppliers requesting
                        access to this registration.
                    </p>
                </div>

                <section className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
                    <h2 className="font-semibold text-indigo-950">
                        Share Public Registration Link
                    </h2>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-700 break-all">
                            {typeof window !== "undefined"
                                ? `${window.location.origin}/supplier/register/${id}`
                                : `/supplier/register/${id}`}
                        </div>

                        <button
                            onClick={copyRegistrationLink}
                            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                        >
                            {copied ? "Copied!" : "Copy Link"}
                        </button>
                    </div>
                </section>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {requests.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="font-medium text-slate-700">
                                No access requests yet.
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Supplier requests will
                                appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">

                            {requests.map(
                                (request) => (
                                    <div
                                        key={
                                            request.id
                                        }
                                        className="p-6"
                                    >
                                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        request.companyName
                                                    }
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {
                                                        request.email
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    Requested{" "}
                                                    {new Date(
                                                        request.createdAt
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">

                                                {request.status ===
                                                    "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    updateStatus(
                                                                        request.id,
                                                                        "approved"
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                                            >
                                                                Approve
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    updateStatus(
                                                                        request.id,
                                                                        "rejected"
                                                                    )
                                                                }
                                                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                {request.status ===
                                                    "approved" && (
                                                        <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                                            Approved
                                                        </span>
                                                    )}

                                                {request.status ===
                                                    "rejected" && (
                                                        <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                                                            Rejected
                                                        </span>
                                                    )}

                                            </div>
                                        </div>
                                    </div>
                                )
                            )}

                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}