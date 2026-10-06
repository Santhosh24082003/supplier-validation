import { Registration } from "@/types/registration";

const KEY = "registrations";

export function getRegistrations(): Registration[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data = localStorage.getItem(KEY);

  return data ? JSON.parse(data) : [];
}

export function saveRegistration(
  registration: Registration
) {
  const existing = getRegistrations();

  existing.push(registration);

  localStorage.setItem(
    KEY,
    JSON.stringify(existing)
  );
}