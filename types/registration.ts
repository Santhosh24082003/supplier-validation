export interface Registration {
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