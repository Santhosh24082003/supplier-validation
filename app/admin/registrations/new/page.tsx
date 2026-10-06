"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRegistration } from "@/lib/storage";

const companyInformationOptions = [
  {
    key: "companyName",
    label: "Company Name",
  },
  {
    key: "companyEmail",
    label: "Company Email",
  },
  {
    key: "phone",
    label: "Phone Number",
  },
  {
    key: "address",
    label: "Company Address",
  },
  {
    key: "country",
    label: "Country",
  },
  {
    key: "taxId",
    label: "Tax / GST Number",
  },
];

export default function CreateRegistration() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [registrationType, setRegistrationType] =
    useState<"open" | "closed" | "hybrid">("open");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [supplierCategory, setSupplierCategory] = useState("");

  const [requiredFields, setRequiredFields] = useState<string[]>([
    "companyName",
    "companyEmail",
  ]);

  const [error, setError] = useState("");

  const handleRequiredFieldChange = (fieldKey: string) => {
    setRequiredFields((currentFields) => {
      if (currentFields.includes(fieldKey)) {
        return currentFields.filter(
          (field) => field !== fieldKey
        );
      }

      return [...currentFields, fieldKey];
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Registration name is required.");
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    if (!endDate) {
      setError("End date is required.");
      return;
    }

    if (endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    if (!supplierCategory) {
      setError("Supplier category is required.");
      return;
    }

    if (requiredFields.length === 0) {
      setError(
        "Select at least one required company information field."
      );
      return;
    }

    const id = crypto.randomUUID();

    const registration = {
      id,
      name: name.trim(),
      registrationType,
      startDate,
      endDate,
        registrationLink: `/supplier/register/${id}`,
      supplierCategory,
      requiredFields,
      createdAt: new Date().toISOString(),
    };

    saveRegistration(registration);

    router.push(`/admin/registrations/${id}/fields`);
  };

return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

            {/* Header */}

            <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                        Supplier Management
                    </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                    Create Supplier Registration
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                    Configure the basic details for your supplier
                    onboarding registration.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                {/* Registration Name */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Registration Details
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Give your supplier registration a clear name.
                        </p>
                    </div>

                    <div className="px-6 py-6 sm:px-8">
                        <label
                            htmlFor="name"
                            className="mb-2 block text-sm font-semibold text-gray-700"
                        >
                            Registration Name
                        </label>

                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            placeholder="Example: 2026 Supplier Onboarding"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>
                </section>

                {/* Registration Type */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Registration Type
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Choose how suppliers will access this registration.
                        </p>
                    </div>

                    <div className="grid gap-4 p-6 sm:p-8">
                        <label
                            className={`flex cursor-pointer gap-4 rounded-xl border p-5 transition ${registrationType === "open"
                                    ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/10"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <input
                                type="radio"
                                name="registrationType"
                                value="open"
                                checked={registrationType === "open"}
                                onChange={() =>
                                    setRegistrationType("open")
                                }
                                className="mt-1 h-4 w-4 accent-indigo-600"
                            />

                            <div>
                                <p className="font-semibold text-gray-900">
                                    Open Registration
                                </p>

                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Anyone with the registration link can
                                    register as a supplier.
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex cursor-pointer gap-4 rounded-xl border p-5 transition ${registrationType === "closed"
                                    ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/10"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <input
                                type="radio"
                                name="registrationType"
                                value="closed"
                                checked={registrationType === "closed"}
                                onChange={() =>
                                    setRegistrationType("closed")
                                }
                                className="mt-1 h-4 w-4 accent-indigo-600"
                            />

                            <div>
                                <p className="font-semibold text-gray-900">
                                    Closed Registration
                                </p>

                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Only invited suppliers can register.
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex cursor-pointer gap-4 rounded-xl border p-5 transition ${registrationType === "hybrid"
                                    ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/10"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <input
                                type="radio"
                                name="registrationType"
                                value="hybrid"
                                checked={registrationType === "hybrid"}
                                onChange={() =>
                                    setRegistrationType("hybrid")
                                }
                                className="mt-1 h-4 w-4 accent-indigo-600"
                            />

                            <div>
                                <p className="font-semibold text-gray-900">
                                    Hybrid Registration
                                </p>

                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Suppliers can register through an open
                                    link and require company approval.
                                </p>
                            </div>
                        </label>
                    </div>
                </section>

                {/* Dates */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Registration Period
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Define when suppliers can submit their registration.
                        </p>
                    </div>

                    <div className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
                        <div>
                            <label
                                htmlFor="startDate"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                Start Date
                            </label>

                            <input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="endDate"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                End Date
                            </label>

                            <input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>
                </section>

                {/* Supplier Category */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Supplier Category
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Select the category that best represents the supplier.
                        </p>
                    </div>

                    <div className="px-6 py-6 sm:px-8">
                        <label
                            htmlFor="supplierCategory"
                            className="mb-2 block text-sm font-semibold text-gray-700"
                        >
                            Category
                        </label>

                        <select
                            id="supplierCategory"
                            value={supplierCategory}
                            onChange={(event) =>
                                setSupplierCategory(event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        >
                            <option value="">
                                Select supplier category
                            </option>

                            <option value="IT">IT</option>

                            <option value="Manufacturing">
                                Manufacturing
                            </option>

                            <option value="Construction">
                                Construction
                            </option>

                            <option value="Logistics">
                                Logistics
                            </option>

                            <option value="Professional Services">
                                Professional Services
                            </option>
                        </select>
                    </div>
                </section>

                {/* Basic Company Information */}

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Basic Company Information
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                            Select the information that suppliers must
                            provide during registration.
                        </p>
                    </div>

                    <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
                        {companyInformationOptions.map((field) => (
                            <label
                                key={field.key}
                                className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${requiredFields.includes(field.key)
                                        ? "border-indigo-500 bg-indigo-50/50"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={requiredFields.includes(
                                        field.key
                                    )}
                                    onChange={() =>
                                        handleRequiredFieldChange(
                                            field.key
                                        )
                                    }
                                    className="h-4 w-4 rounded accent-indigo-600"
                                />

                                <span className="text-sm font-medium text-gray-800">
                                    {field.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                {/* Error */}

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">
                            !
                        </div>

                        <p>{error}</p>
                    </div>
                )}

                {/* Submit */}

                <div className="flex justify-end border-t border-gray-200 pt-6">
                    <button
                        type="submit"
                        className="rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                    >
                        Create Registration
                    </button>
                </div>
            </form>
        </div>
    </main>
);
}

