"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

type QuickBooksRow = {
  treatment: TreatmentRecord;
  invoiceNo: string;
  customer: string;
  invoiceDate: string;
  dueDate: string;
  terms: string;
  item: string;
  itemDescription: string;
  itemQuantity: string;
  itemRate: string;
  itemAmount: string;
  itemTaxCode: string;
  itemTaxAmount: string;
  serviceDate: string;
  problems: string[];
};

const QUICKBOOKS_HEADERS = [
  "*InvoiceNo",
  "*Customer",
  "*InvoiceDate",
  "*DueDate",
  "Terms",
  "Item(Product/Service)",
  "ItemDescription",
  "ItemQuantity",
  "ItemRate",
  "*ItemAmount",
  "*ItemTaxCode",
  "ItemTaxAmount",
  "Service Date",
] as const;

const QUICKBOOKS_TERMS = "Due on receipt";
const QUICKBOOKS_TAX_CODE = "20.0% S";

const PRODUCT_SERVICE_MAP: Record<string, string> = {
  "spring weed and feed":
    "Standard Lawn Treatments:Spring Weed and Feed",
  "summer weed and feed":
    "Standard Lawn Treatments:Summer Weed and Feed",
  "autumn weed and feed":
    "Standard Lawn Treatments:Autumn Weed and Feed",
  "winter moss control 1":
    "Standard Lawn Treatments:Winter Moss Control 1",
  "winter moss control 2":
    "Standard Lawn Treatments:Winter Moss Control 2",

  "scarification and aeration":
    "Additional Lawn Treatment:Scarification and Aeration",
  scarification:
    "Additional Lawn Treatment:Scarification",
  aeration:
    "Additional Lawn Treatment:Aeration",
  overseeding:
    "Additional Lawn Treatment:Overseeding",
  "turfsolv grub control":
    "Additional Lawn Treatment:TurfSolv Grub Control",
  "wetting agent":
    "Additional Lawn Treatment:Wetting Agent",
  "chafer grub / leatherjacket insecticide":
    "Additional Lawn Treatment:Chafer Grub / Leatherjacket Insecticide",
  "lawn recovery booster":
    "Additional Lawn Treatment:Lawn Recovery Booster",
};

export default function QuickBooksExportPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading QuickBooks export...
            </div>
          </main>
        </AppShell>
      }
    >
      <QuickBooksExportPageContent />
    </Suspense>
  );
}

function QuickBooksExportPageContent() {
  const searchParams = useSearchParams();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const requestedDate =
    searchParams.get("date");

  const [selectedDate, setSelectedDate] =
    useState(
      isDateValue(requestedDate)
        ? requestedDate
        : getTodayDateValue(),
    );

  const exportRows = useMemo<QuickBooksRow[]>(
    () =>
      treatments
        .filter(
          (treatment) =>
            treatment.status === "Completed" &&
            treatment.completedDate === selectedDate,
        )
        .map((treatment) => {
          const customer = customers.find(
            (item) =>
              item.customerNumber ===
              treatment.customerNumber,
          );

          const productService =
            getQuickBooksProductService(
              treatment.treatmentName,
            );

          const problems: string[] = [];

          if (!treatment.invoiceNumber.trim()) {
            problems.push(
              "Missing invoice number",
            );
          }

          if (!customer) {
            problems.push(
              "Customer record not found",
            );
          }

          if (!productService) {
            problems.push(
              `No QuickBooks Product/Service mapping for \"${treatment.treatmentName || "Unnamed treatment"}\"`,
            );
          }

          if (
            !Number.isFinite(
              treatment.invoiceAmount,
            ) ||
            treatment.invoiceAmount <= 0
          ) {
            problems.push(
              "Invoice amount must be greater than £0",
            );
          }

          const quickBooksDate =
            formatQuickBooksDate(
              treatment.completedDate,
            );

          return {
            treatment,
            invoiceNo:
              treatment.invoiceNumber.trim(),
            customer: customer
              ? `${customer.fullName.trim()} (${customer.customerNumber})`
              : `Customer ${treatment.customerNumber}`,
            invoiceDate: quickBooksDate,
            dueDate: quickBooksDate,
            terms: QUICKBOOKS_TERMS,
            item: productService,
            itemDescription: "",
            itemQuantity: "",
            itemRate: "1",
            itemAmount: formatQuickBooksMoney(
              treatment.invoiceAmount,
            ),
            itemTaxCode:
              QUICKBOOKS_TAX_CODE,
            itemTaxAmount: "",
            serviceDate: quickBooksDate,
            problems,
          };
        })
        .sort(compareQuickBooksRows),
    [customers, selectedDate, treatments],
  );

  const problemRows = exportRows.filter(
    (row) => row.problems.length > 0,
  );

  const totalAmount = exportRows.reduce(
    (total, row) =>
      total + row.treatment.invoiceAmount,
    0,
  );

  const ready =
    customersReady && treatmentsReady;

  const canExport =
    ready &&
    exportRows.length > 0 &&
    problemRows.length === 0;

  function downloadQuickBooksCsv() {
    if (!canExport) {
      return;
    }

    const csvRows = [
      [...QUICKBOOKS_HEADERS],
      ...exportRows.map((row) => [
        row.invoiceNo,
        row.customer,
        row.invoiceDate,
        row.dueDate,
        row.terms,
        row.item,
        row.itemDescription,
        row.itemQuantity,
        row.itemRate,
        row.itemAmount,
        row.itemTaxCode,
        row.itemTaxAmount,
        row.serviceDate,
      ]),
    ];

    const csv = csvRows
      .map((row) =>
        row
          .map(escapeCsvValue)
          .join(","),
      )
      .join("\r\n");

    const bytes = encodeWindows1252(csv);
    const blob = new Blob([bytes], {
      type: "text/csv;charset=windows-1252",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `QuickBooks Invoices ${selectedDate}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#176b37]">
                  End-of-day accounts
                </div>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  QuickBooks CSV export
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Export completed GreenFlow invoices in the same 13-column format as your working QuickBooks template.
                </p>
              </div>

              <Link
                href={`/?date=${selectedDate}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Back to Dashboard
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Completed date
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    getTodayDateValue(),
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>

              <div className="ml-auto">
                <button
                  type="button"
                  onClick={downloadQuickBooksCsv}
                  disabled={!canExport}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition ${
                    canExport
                      ? "bg-[#176b37] text-white hover:bg-[#12582d]"
                      : "cursor-not-allowed bg-slate-200 text-slate-500"
                  }`}
                >
                  Download QuickBooks CSV
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Completed invoices"
              value={exportRows.length.toString()}
              detail={formatDateWithDay(
                selectedDate,
              )}
            />

            <SummaryCard
              label="Invoice total"
              value={formatPounds(totalAmount)}
              detail="Gross amount exported"
            />

            <SummaryCard
              label="Ready to export"
              value={
                (
                  exportRows.length -
                  problemRows.length
                ).toString()
              }
              detail="Rows with all required mappings"
            />

            <SummaryCard
              label="Needs attention"
              value={problemRows.length.toString()}
              detail={
                problemRows.length === 0
                  ? "No export problems"
                  : "Fix before downloading"
              }
              warning={
                problemRows.length > 0
              }
            />
          </section>

          {!ready ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Loading completed invoices...
            </section>
          ) : exportRows.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-lg font-bold text-slate-900">
                No completed invoices for this date
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Complete the day in Visit Centre first, then the invoices will appear here automatically.
              </p>
            </section>
          ) : (
            <>
              {problemRows.length > 0 && (
                <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
                  <h2 className="text-base font-bold text-amber-900">
                    Export needs attention
                  </h2>
                  <p className="mt-1 text-sm text-amber-800">
                    The CSV button stays disabled until every row has a valid customer, invoice amount and QuickBooks Product/Service mapping. GreenFlow will not invent missing QuickBooks values.
                  </p>

                  <div className="mt-4 space-y-2">
                    {problemRows.map((row) => (
                      <div
                        key={row.treatment.id}
                        className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm"
                      >
                        <div className="font-bold text-slate-900">
                          {row.invoiceNo || "No invoice number"}
                          {" · "}
                          {row.customer}
                        </div>
                        <div className="mt-1 text-amber-800">
                          {row.problems.join(" • ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    QuickBooks export preview
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Customer names are exported as Full Name followed by one space and the customer number in brackets.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          Invoice
                        </th>
                        <th className="px-4 py-3">
                          Customer
                        </th>
                        <th className="px-4 py-3">
                          Date
                        </th>
                        <th className="px-4 py-3">
                          Product / Service
                        </th>
                        <th className="px-4 py-3 text-right">
                          Amount
                        </th>
                        <th className="px-4 py-3">
                          Tax code
                        </th>
                        <th className="px-4 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {exportRows.map((row) => (
                        <tr
                          key={row.treatment.id}
                          className="align-top"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                            {row.invoiceNo || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {row.customer}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {row.invoiceDate}
                          </td>
                          <td className="min-w-[300px] px-4 py-3 text-slate-700">
                            {row.item || (
                              <span className="font-semibold text-amber-700">
                                Not mapped
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                            {row.itemAmount}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {row.itemTaxCode}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {row.problems.length === 0 ? (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                                Ready
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                Check
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-bold text-slate-900">
                  Export rules used
                </h2>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="font-semibold text-slate-900">
                      QuickBooks fields
                    </div>
                    <div className="mt-1 leading-6">
                      Due date matches invoice date, Terms is “Due on receipt”, Item Rate is 1, and Tax Code is “20.0% S”, matching your successful template.
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="font-semibold text-slate-900">
                      Safe treatment mapping
                    </div>
                    <div className="mt-1 leading-6">
                      Only the Standard and Additional Lawn Treatment Product/Service names you supplied are exported. Unknown treatment names are flagged instead of guessed.
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        warning
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${
          warning
            ? "text-amber-800"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}

function getQuickBooksProductService(
  treatmentName: string,
) {
  const cleanName = treatmentName
    .trim()
    .replace(
      /^standard lawn treatments:/i,
      "",
    )
    .replace(
      /^additional lawn treatment:/i,
      "",
    )
    .trim()
    .toLowerCase();

  return PRODUCT_SERVICE_MAP[cleanName] ?? "";
}

function compareQuickBooksRows(
  first: QuickBooksRow,
  second: QuickBooksRow,
) {
  const firstNumber = Number(
    first.invoiceNo,
  );
  const secondNumber = Number(
    second.invoiceNo,
  );

  if (
    Number.isFinite(firstNumber) &&
    Number.isFinite(secondNumber) &&
    first.invoiceNo !== "" &&
    second.invoiceNo !== ""
  ) {
    return firstNumber - secondNumber;
  }

  return first.invoiceNo.localeCompare(
    second.invoiceNo,
    "en-GB",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function formatQuickBooksDate(
  value: string,
) {
  if (!isDateValue(value)) {
    return "";
  }

  const [year, month, day] =
    value.split("-");

  return `${day}/${month}/${year}`;
}

function formatQuickBooksMoney(
  value: number,
) {
  const safeValue =
    Number.isFinite(value) ? value : 0;

  return `£${safeValue.toFixed(2)}`;
}

function formatPounds(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function escapeCsvValue(value: string) {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function encodeWindows1252(value: string) {
  const extraCharacters =
    new Map<number, number>([
      [0x20ac, 0x80],
      [0x201a, 0x82],
      [0x0192, 0x83],
      [0x201e, 0x84],
      [0x2026, 0x85],
      [0x2020, 0x86],
      [0x2021, 0x87],
      [0x02c6, 0x88],
      [0x2030, 0x89],
      [0x0160, 0x8a],
      [0x2039, 0x8b],
      [0x0152, 0x8c],
      [0x017d, 0x8e],
      [0x2018, 0x91],
      [0x2019, 0x92],
      [0x201c, 0x93],
      [0x201d, 0x94],
      [0x2022, 0x95],
      [0x2013, 0x96],
      [0x2014, 0x97],
      [0x02dc, 0x98],
      [0x2122, 0x99],
      [0x0161, 0x9a],
      [0x203a, 0x9b],
      [0x0153, 0x9c],
      [0x017e, 0x9e],
      [0x0178, 0x9f],
    ]);

  const bytes: number[] = [];

  for (const character of value) {
    const codePoint =
      character.codePointAt(0) ?? 63;

    if (
      codePoint <= 0x7f ||
      (codePoint >= 0xa0 &&
        codePoint <= 0xff)
    ) {
      bytes.push(codePoint);
      continue;
    }

    bytes.push(
      extraCharacters.get(codePoint) ??
        0x3f,
    );
  }

  return new Uint8Array(bytes);
}

function isDateValue(
  value: string | null,
): value is string {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const parsed = new Date(
    year,
    month - 1,
    day,
  );

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}
