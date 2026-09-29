"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import {
  type AdditionalCustomerJob,
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";
import { useRouteOrderStore } from "@/components/route-order-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

function createAdditionalJobProgramme(
  customer: StoredCustomer,
  job: AdditionalCustomerJob,
): CustomerProgramme {
  return {
    id: `additional-jobs-${customer.customerNumber}`,
    customerNumber: customer.customerNumber,
    year:
      Number(
        job.scheduledDate.slice(0, 4),
      ) || new Date().getFullYear(),
    createdAt: job.createdAt,
    programmeName: "Additional Jobs",
    startDate: job.scheduledDate,
    avoidWednesdays: false,
    avoidWeekends: false,
    visits: [
      {
        id: job.id,
        visitNumber: 0,
        treatmentName: job.treatmentName,
        scheduledDate: job.scheduledDate,
        gapAfterPreviousDays: 0,
        status: "Scheduled",
        notes: job.notes,
      },
    ],
  };
}

function hasRecordedOutcome(
  treatments: TreatmentRecord[],
  programme: CustomerProgramme,
  visit: ProgrammeVisit,
  customerNumber: string,
) {
  return treatments.some(
    (treatment) =>
      (
        treatment.status === "Completed" ||
        treatment.status === "Cancelled"
      ) &&
      (
        (
          treatment.programmeId === programme.id &&
          treatment.programmeVisitId === visit.id
        ) ||
        (
          !treatment.programmeVisitId &&
          treatment.customerNumber === customerNumber &&
          treatment.scheduledDate === visit.scheduledDate &&
          treatment.treatmentName === visit.treatmentName
        )
      ),
  );
}
export default function TodayPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    ready: routeOrderReady,
    sortBySavedRoute,
  } = useRouteOrderStore();

  const searchParams = useSearchParams();
  const requestedDate = searchParams.get("date")?.trim() ?? "";
  const today =
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : getTodayDateValue();

  const jobs = useMemo(() => {
    const seasonalItems =
      programmes.flatMap((programme) => {
        const customer =
          customers.find(
            (item) =>
              item.customerNumber ===
              programme.customerNumber,
          );

        if (
          !customer ||
          customer.status !== "Active"
        ) {
          return [];
        }

        return programme.visits
          .filter(
            (visit) =>
              visit.scheduledDate === today &&
              (
                visit.status === "Scheduled" ||
                visit.status === "Planned"
              ),
          )
          .filter(
            (visit) =>
              !hasRecordedOutcome(
                treatments,
                programme,
                visit,
                customer.customerNumber,
              ),
          )
          .map((visit) => ({
            id: `${programme.id}-${visit.id}`,
            source: "programme" as const,
            programme,
            visit,
            customer,
            price: customer.treatmentPrice,
          }));
      });

    const additionalItems =
      customers.flatMap((customer) => {
        if (customer.status !== "Active") {
          return [];
        }

        return customer.additionalJobs
          .filter(
            (job) =>
              job.status === "Scheduled" &&
              job.scheduledDate === today,
          )
          .map((job) => {
            const programme =
              createAdditionalJobProgramme(
                customer,
                job,
              );

            return {
              id: `additional-${job.id}`,
              source: "additional" as const,
              programme,
              visit: programme.visits[0],
              customer,
              price: job.price,
              additionalJob: job,
            };
          });
      });

    return sortBySavedRoute(
      [
        ...seasonalItems,
        ...additionalItems,
      ],
      today,
    );
  }, [
    programmes,
    customers,
    treatments,
    today,
    sortBySavedRoute,
  ]);

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady &&
    routeOrderReady;

  return (
    <AppShell>
      <main className="gf-page">
        <div className="gf-page-inner">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Mobile workflow
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {formatDateWithDay(today)}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {!ready
                ? "Loading today's route..."
                : jobs.length === 1
                  ? "1 job remaining today."
                  : `${jobs.length} jobs remaining today.`}
            </p>

            {ready && jobs.length > 0 ? (
              <div className="mt-6 space-y-4">
                {jobs.map((job, index) => (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {job.visit.treatmentName}
                        </p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {job.customer.fullName}
                        </p>

                        <p className="text-sm text-slate-600">
                          Customer {job.customer.customerNumber}
                        </p>

                        <p className="mt-3 text-sm text-slate-700">
                          {job.customer.address}
                        </p>

                        <p className="text-sm font-medium text-slate-900">
                          {job.customer.postcode}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Group {job.customer.groupNumber}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Van {job.customer.vanNumber}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {job.customer.lawnSize} m²
                          </span>
                        </div>

                        {(job.customer.lockedGate ||
                          job.customer.dogOnProperty) && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            {job.customer.lockedGate && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                                Locked gate
                              </span>
                            )}
                            {job.customer.dogOnProperty && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                                Dog on property
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </AppShell>
  );
}