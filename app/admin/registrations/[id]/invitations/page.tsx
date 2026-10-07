"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
    createSupplierAccessCode,
    ensureSupplierInvitationCodes,
    getRegistrations,
    saveSupplierInvitation,
} from "@/lib/storage";

import { SupplierInvitation } from "@/types/registration";

export default function InvitationsPage() {
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;

    const [email, setEmail] = useState("");

    const [invitations, setInvitations] =
        useState<SupplierInvitation[]>([]);

    const [isClosedRegistration, setIsClosedRegistration] =
        useState(false);

    const [error, setError] = useState("");

    const [copied, setCopied] = useState(false);

    const [copiedInvitationId, setCopiedInvitationId] =
        useState("");

    useEffect(() => {
        const registration = getRegistrations().find(
            (item) => item.id === id
        );

        setIsClosedRegistration(
            registration?.registrationType === "closed"
        );
        setInvitations(
            ensureSupplierInvitationCodes(id)
        );
    }, [id]);

    async function copyRegistrationLink() {
        const link =
            `${window.location.origin}/supplier/register/${id}`;

        await navigator.clipboard.writeText(link);
        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
    }

    async function copyInvitationDetails(
        invitation: SupplierInvitation
    ) {
        const link =
            `${window.location.origin}/supplier/register/${id}`;

        await navigator.clipboard.writeText(
            `Supplier registration link: ${link}\n` +
            `Email: ${invitation.email}\n` +
            `Access code: ${invitation.accessCode}`
        );

        setCopiedInvitationId(invitation.id);

        setTimeout(() => setCopiedInvitationId(""), 2000);
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        if (
            isClosedRegistration &&
            invitations.length >= 1
        ) {
            setError(
                "Only one supplier can be invited to a closed registration."
            );

            return;
        }

        const cleanEmail =
            email.trim().toLowerCase();

        if (!cleanEmail) {
            setError(
                "Supplier email is required."
            );

            return;
        }

        if (!cleanEmail.includes("@")) {
            setError(
                "Please enter a valid email address."
            );

            return;
        }

        const alreadyExists = invitations.some(
            (invitation) =>
                invitation.email.toLowerCase() ===
                cleanEmail
        );

        if (alreadyExists) {
            setError(
                "This supplier email has already been invited."
            );

            return;
        }

        const accessCode = createSupplierAccessCode();

        const invitation: SupplierInvitation = {
            id: crypto.randomUUID(),

            registrationId: id,

            email: cleanEmail,

            accessCode,

            status: "invited",

            createdAt:
                new Date().toISOString(),
        };

        saveSupplierInvitation(
            invitation
        );

        setInvitations((current) => [
            ...current,
            invitation,
        ]);

        setEmail("");
    }

    return (
        <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-5xl">

                <button
                    onClick={() =>
                        router.push(
                            "/admin"
                        )
                    }
                    className="mb-6 text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                    ← Back to Admin Dashboard
                </button>

                <div className="mb-8">
                    <p className="text-sm font-semibold text-blue-700">
                        Closed Registration
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900">
                        Supplier Invitations
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Only suppliers whose email
                        addresses are added here can
                        access this registration.
                    </p>
                </div>

                <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
                    <h2 className="font-semibold text-blue-950">
                        Share Registration Link
                    </h2>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-slate-700 break-all">
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

                {/* Add Supplier */}

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Invite Supplier
                    </h2>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-5 flex flex-col gap-3 sm:flex-row"
                    >
                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            placeholder="supplier@company.com"
                            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />

                        <button
                            disabled={
                                isClosedRegistration &&
                                invitations.length >= 1
                            }
                            type="submit"
                            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {isClosedRegistration && invitations.length >= 1
                                ? "Invitation Created"
                                : "Add Supplier"}
                        </button>
                    </form>

                    {isClosedRegistration && invitations.length >= 1 && (
                        <p className="mt-3 text-sm text-slate-500">
                            Closed registrations allow only one supplier invitation.
                        </p>
                    )}

                    {error && (
                        <p className="mt-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </section>

                {/* Supplier List */}

                <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="font-semibold text-slate-900">
                            Invited Suppliers
                        </h2>
                    </div>

                    {invitations.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500">
                            No suppliers have been
                            invited yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {invitations.map(
                                (invitation) => (
                                    <div
                                        key={
                                            invitation.id
                                        }
                                        className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {
                                                    invitation.email
                                                }
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                Invited on{" "}
                                                {new Date(
                                                    invitation.createdAt
                                                ).toLocaleDateString()}
                                            </p>

                                            <p className="mt-1 text-xs font-semibold text-indigo-600">
                                                Access code: {invitation.accessCode}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    copyInvitationDetails(
                                                        invitation
                                                    )
                                                }
                                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                            >
                                                {copiedInvitationId === invitation.id
                                                    ? "Copied"
                                                    : "Copy invite"}
                                            </button>

                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                {
                                                    invitation.status
                                                }
                                            </span>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}