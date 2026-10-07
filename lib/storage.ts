import { Registration } from "@/types/registration";
import {
    SupplierInvitation,
    SupplierAccessRequest,
} from "@/types/registration";

const REGISTRATIONS_KEY = "registrations";

export function getRegistrations(): Registration[] {
    if (typeof window === "undefined") {
        return [];
    }

    const data =
        localStorage.getItem(REGISTRATIONS_KEY);

    return data ? JSON.parse(data) : [];
}

export function saveRegistration(
    registration: Registration
) {
    const existing = getRegistrations();

    existing.push(registration);

    localStorage.setItem(
        REGISTRATIONS_KEY,
        JSON.stringify(existing)
    );
}

export function updateRegistrationApprovalStatus(
    registrationId: string,
    approvalStatus: "pending" | "approved" | "rejected"
) {
    const existing = getRegistrations();

    const updated = existing.map((registration) =>
        registration.id === registrationId
            ? {
                ...registration,
                approvalStatus,
            }
            : registration
    );

    localStorage.setItem(
        REGISTRATIONS_KEY,
        JSON.stringify(updated)
    );
}

/* -------------------------------- */
/* CLOSED REGISTRATION INVITATIONS */
/* -------------------------------- */

function getInvitationKey(
    registrationId: string
) {
    return `registration-invitations-${registrationId}`;
}

export function createSupplierAccessCode() {
    const randomValues = new Uint32Array(1);

    crypto.getRandomValues(randomValues);

    return String(
        100000 + (randomValues[0] % 900000)
    );
}

export function getSupplierInvitations(
    registrationId: string
): SupplierInvitation[] {
    if (typeof window === "undefined") {
        return [];
    }

    const data = localStorage.getItem(
        getInvitationKey(registrationId)
    );

    return data ? JSON.parse(data) : [];
}

export function ensureSupplierInvitationCodes(
    registrationId: string
): SupplierInvitation[] {
    const invitations = getSupplierInvitations(
        registrationId
    );

    const updatedInvitations = invitations.map(
        (invitation) =>
            invitation.accessCode
                ? invitation
                : {
                    ...invitation,
                    accessCode: createSupplierAccessCode(),
                }
    );

    if (
        updatedInvitations.some(
            (invitation, index) =>
                invitation.accessCode !==
                invitations[index].accessCode
        )
    ) {
        localStorage.setItem(
            getInvitationKey(registrationId),
            JSON.stringify(updatedInvitations)
        );
    }

    return updatedInvitations;
}

export function saveSupplierInvitation(
    invitation: SupplierInvitation
) {
    const existing =
        getSupplierInvitations(
            invitation.registrationId
        );

    existing.push(invitation);

    localStorage.setItem(
        getInvitationKey(
            invitation.registrationId
        ),
        JSON.stringify(existing)
    );
}

export function updateSupplierInvitation(
    registrationId: string,
    invitationId: string,
    status: "invited" | "used"
) {
    const existing =
        getSupplierInvitations(registrationId);

    const updated = existing.map(
        (invitation) =>
            invitation.id === invitationId
                ? {
                      ...invitation,
                      status,
                  }
                : invitation
    );

    localStorage.setItem(
        getInvitationKey(registrationId),
        JSON.stringify(updated)
    );
}

/* ----------------------------- */
/* HYBRID ACCESS REQUESTS        */
/* ----------------------------- */

function getRequestKey(
    registrationId: string
) {
    return `registration-requests-${registrationId}`;
}

export function getSupplierAccessRequests(
    registrationId: string
): SupplierAccessRequest[] {
    if (typeof window === "undefined") {
        return [];
    }

    const data = localStorage.getItem(
        getRequestKey(registrationId)
    );

    return data ? JSON.parse(data) : [];
}

export function saveSupplierAccessRequest(
    request: SupplierAccessRequest
) {
    const existing =
        getSupplierAccessRequests(
            request.registrationId
        );

    existing.push(request);

    localStorage.setItem(
        getRequestKey(
            request.registrationId
        ),
        JSON.stringify(existing)
    );
}

export function updateSupplierAccessRequest(
    registrationId: string,
    requestId: string,
    status:
        | "pending"
        | "approved"
        | "rejected"
) {
    const existing =
        getSupplierAccessRequests(
            registrationId
        );

    const updated = existing.map(
        (request) =>
            request.id === requestId
                ? {
                      ...request,
                      status,
                  }
                : request
    );

    localStorage.setItem(
        getRequestKey(registrationId),
        JSON.stringify(updated)
    );
}