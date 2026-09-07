"use client";

import Link from "next/link";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatDateWithDay,
  getTodayDateValue,
  parseDate,
} from "@/lib/date-utils";

import { AppShell } from "@/components/app-shell";
import { useActionStore } from "@/components/action-store";
import { useChemicalStore } from "@/components/chemical-store";

import { useCustomerStore } from "@/components/customer-store";

import { useEnquiryStore } from "@/components/enquiry-store";

import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";

import {
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

type CommunicationRecord = {
  id: string;

  status:
    | "Queued"
    | "Sent"
    | "Failed"
    | "Cancelled";

  customerNumber?: string;
  scheduledDate?: string;
  treatmentName?: string;
  jobType?: "programme" | "additional";
};

type CommunicationsData = {
  records: CommunicationRecord[];
};

const COMMUNICATIONS_STORAGE_KEY =
  "greenflow-communications-v1";

export default function DashboardPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    enquiries,
    ready: enquiriesReady,
  } = useEnquiryStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    chemicals,
    ready: chemicalsReady,
  } = useChemicalStore();

  const {
    actions,
    ready: actionsReady,
  } = useActionStore();

  const [
    communicationsData,
    setCommunicationsData,
  ] = useState<CommunicationsData>({
    records: [],
  });

  const [
  selectedDate,
  setSelectedDate,
  ] = useState(() =>
  getTodayDateValue(),
  );

  useEffect(() => {
    const requestedDate =
      new URLSearchParams(
        window.location.search,
      ).get("date") ?? "";

    if (isDateValue(requestedDate)) {
      setSelectedDate(requestedDate);
    }
  }, []);

  useEffect(() => {
    loadLocalModules();

    function refreshLocalModules() {
      loadLocalModules();
    }

    window.addEventListener(
      "focus",
      refreshLocalModules,
    );

    window.addEventListener(
      "storage",
      refreshLocalModules,
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshLocalModules,
      );

      window.removeEventListener(
        "storage",
        refreshLocalModules,
      );
    };
  }, []);

  function loadLocalModules() {
    const savedCommunications =
      window.localStorage.getItem(
        COMMUNICATIONS_STORAGE_KEY,
      );

    if (savedCommunications) {
      try {
        const parsedCommunications =
          JSON.parse(
            savedCommunications,
          ) as CommunicationsData;

        if (
          Array.isArray(
            parsedCommunications.records,
          )
        ) {
          setCommunicationsData(
            parsedCommunications,
          );
        }
      } catch {
        setCommunicationsData({
          records: [],
        });
      }
    } else {
      setCommunicationsData({
        records: [],
      });
    }
  }

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (customer) =>
            customer.status ===
            "Active",
        ),
      [customers],
    );

  const additionalJobSummary =
    useMemo(() => {
      const rows = activeCustomers.flatMap(
        (customer) =>
          (customer.additionalJobs ?? []).map(
            (job) => ({
              customer,
              job,
            }),
          ),
      );

      const unscheduled = rows.filter(
        ({ job }) =>
          job.status === "Unscheduled",
      );

      const scheduled = rows.filter(
        ({ job }) =>
          job.status === "Scheduled",
      );

      const selectedDateJobs =
        scheduled.filter(
          ({ job }) =>
            job.scheduledDate ===
            selectedDate,
        );

      return {
        unscheduledCount:
          unscheduled.length,
        unscheduledValue:
          unscheduled.reduce(
            (total, { job }) =>
              total + job.price,
            0,
          ),
        scheduledCount:
          scheduled.length,
        scheduledValue:
          scheduled.reduce(
            (total, { job }) =>
              total + job.price,
            0,
          ),
        selectedDateCount:
          selectedDateJobs.length,
        selectedDateValue:
          selectedDateJobs.reduce(
            (total, { job }) =>
              total + job.price,
            0,
          ),
      };
    }, [
      activeCustomers,
      selectedDate,
    ]);

  const scheduledVisits =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

      return programmes
        .flatMap((programme) =>
          programme.visits
            .filter(
              (visit) =>
                visit.scheduledDate ===
                  selectedDate &&
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned"),
            )
            .map((visit) => ({
              programme,
              visit,

              customer:
                customers.find(
                  (customer) =>
                    customer.customerNumber ===
                    programme.customerNumber,
                ),
            }))
            .filter(
              (item) =>
                !item.customer ||
                !hasFinalRecordedOutcome(
                  treatments,
                  item.programme,
                  item.visit,
                  item.customer.customerNumber,
                ),
            ),
        )
        .filter(
          (item) =>
            item.customer?.status ===
            "Active",
        );
    }, [
      programmes,
      customers,
      treatments,
      selectedDate,
    ]);

  const scheduledAdditionalJobs =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

      return activeCustomers.flatMap(
        (customer) =>
          (customer.additionalJobs ?? [])
            .filter(
              (job) =>
                job.status === "Scheduled" &&
                job.scheduledDate === selectedDate,
            )
            .map((job) => ({
              customer,
              job,
            })),
      );
    }, [activeCustomers, selectedDate]);

  const scheduledWork = useMemo(
    () => [
      ...scheduledVisits.map(
        ({ programme, visit, customer }) => ({
          key: `programme-${programme.id}-${visit.id}`,
          source: "programme" as const,
          customer,
          treatmentName: visit.treatmentName,
          price: customer?.treatmentPrice ?? 0,
        }),
      ),
      ...scheduledAdditionalJobs.map(
        ({ customer, job }) => ({
          key: `additional-${customer.customerNumber}-${job.id}`,
          source: "additional" as const,
          customer,
          treatmentName: job.treatmentName,
          price: job.price ?? 0,
        }),
      ),
    ],
    [scheduledVisits, scheduledAdditionalJobs],
  );

  const selectedDateTreatments =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

      return treatments.filter(
        (treatment) =>
          treatment.completedDate ===
            selectedDate ||
          treatment.scheduledDate ===
            selectedDate,
      );
    }, [
      treatments,
      selectedDate,
    ]);

  const completedOnSelectedDate =
    selectedDateTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Completed",
    ).length;

  const reschedulingRecords =
    treatments.filter(
      (treatment) =>
        treatment.status ===
        "Needs Rescheduling",
    );

  const totalScheduledArea =
    scheduledWork.reduce(
      (total, item) =>
        total +
        (item.customer?.lawnSize ?? 0),
      0,
    );

  const expectedIncome =
    scheduledWork.reduce(
      (total, item) => total + item.price,
      0,
    );

  const lockedGateCount =
    scheduledWork.filter(
      (item) => item.customer?.lockedGate,
    ).length;

  const lowStockProducts =
    chemicals.filter(
      (chemical) =>
        chemical.active &&
        chemical.currentStock <=
          chemical.reorderLevel,
    );

  const tomorrowDate =
    shiftDateValue(
      getTodayDateValue(),
      1,
    );

  const tomorrowProgrammeVisits =
    useMemo(
      () =>
        programmes
          .flatMap((programme) =>
            programme.visits
              .filter(
                (visit) =>
                  visit.scheduledDate ===
                    tomorrowDate &&
                  (visit.status ===
                    "Scheduled" ||
                    visit.status ===
                      "Planned"),
              )
              .map((visit) => ({
                programme,
                visit,
                customer:
                  customers.find(
                    (customer) =>
                      customer.customerNumber ===
                      programme.customerNumber,
                  ),
              }))
              .filter(
                (item) =>
                  item.customer?.status ===
                    "Active" &&
                  !hasFinalRecordedOutcome(
                    treatments,
                    item.programme,
                    item.visit,
                    item.customer
                      .customerNumber,
                  ),
              ),
          )
          .map(
            ({
              programme,
              visit,
              customer,
            }) => ({
              key: `programme-${programme.id}-${visit.id}`,
              customerNumber:
                customer!
                  .customerNumber,
              treatmentName:
                visit.treatmentName,
              jobType:
                "programme" as const,
            }),
          ),
      [
        programmes,
        customers,
        treatments,
        tomorrowDate,
      ],
    );

  const tomorrowAdditionalJobs =
    useMemo(
      () =>
        activeCustomers.flatMap(
          (customer) =>
            (
              customer.additionalJobs ??
              []
            )
              .filter(
                (job) =>
                  job.status ===
                    "Scheduled" &&
                  job.scheduledDate ===
                    tomorrowDate,
              )
              .map((job) => ({
                key: `additional-${customer.customerNumber}-${job.id}`,
                customerNumber:
                  customer.customerNumber,
                treatmentName:
                  job.treatmentName,
                jobType:
                  "additional" as const,
              })),
        ),
      [
        activeCustomers,
        tomorrowDate,
      ],
    );

  const tomorrowReminderSummary =
    useMemo(() => {
      const work = [
        ...tomorrowProgrammeVisits,
        ...tomorrowAdditionalJobs,
      ];

      let queued = 0;
      let sent = 0;
      let needsAttention = 0;

      work.forEach((item) => {
        const matchingRecords =
          communicationsData.records.filter(
            (record) =>
              record.customerNumber ===
                item.customerNumber &&
              record.scheduledDate ===
                tomorrowDate &&
              record.treatmentName ===
                item.treatmentName &&
              record.jobType ===
                item.jobType,
          );

        if (
          matchingRecords.some(
            (record) =>
              record.status === "Sent",
          )
        ) {
          sent += 1;
          return;
        }

        if (
          matchingRecords.some(
            (record) =>
              record.status ===
              "Queued",
          )
        ) {
          queued += 1;
          return;
        }

        needsAttention += 1;
      });

      return {
        scheduled: work.length,
        queued,
        sent,
        needsAttention,
      };
    }, [
      communicationsData.records,
      tomorrowAdditionalJobs,
      tomorrowDate,
      tomorrowProgrammeVisits,
    ]);

  const queuedMessages =
    communicationsData.records.filter(
      (record) =>
        record.status === "Queued",
    );

  const currentYear =
    new Date().getFullYear();

  const customerNumbersWithCurrentProgramme =
    useMemo(
      () =>
        new Set(
          programmes
            .filter(
              (programme) =>
                programme.year ===
                currentYear,
            )
            .map(
              (programme) =>
                programme.customerNumber,
            ),
        ),
      [
        programmes,
        currentYear,
      ],
    );

  const customersWithoutProgramme =
    activeCustomers.filter(
      (customer) =>
        !customerNumbersWithCurrentProgramme.has(
          customer.customerNumber,
        ),
    );

  const newEnquiries =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
        "New Enquiry",
    );

  const arrangedSiteVisits =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
        "Visit Arranged",
    );

  const outstandingQuotes =
    enquiries.filter(
      (enquiry) =>
        enquiry.quoteStatus ===
          "Draft" ||
        enquiry.quoteStatus ===
          "Presented",
    );

  const acceptedEnquiries =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
          "Quote Accepted" &&
        !enquiry.convertedCustomerNumber,
    );

  const recentEnquiries =
    useMemo(
      () =>
        [...enquiries]
          .sort(
            (first, second) =>
              new Date(
                second.updatedAt,
              ).getTime() -
              new Date(
                first.updatedAt,
              ).getTime(),
          )
          .slice(0, 5),
      [enquiries],
    );

  const recentTreatments =
    useMemo(
      () =>
        [...treatments]
          .sort(
            (first, second) =>
              new Date(
                second.recordedDate,
              ).getTime() -
              new Date(
                first.recordedDate,
              ).getTime(),
          )
          .slice(0, 5),
      [treatments],
    );

  const upcomingVisits =
    useMemo(() => {
      const today =
        getTodayDateValue();

      return programmes
        .flatMap((programme) => {
          const customer =
            customers.find(
              (record) =>
                record.customerNumber ===
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
                visit.scheduledDate >=
                  today &&
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned"),
            )
            .filter(
              (visit) =>
                !hasFinalRecordedOutcome(
                  treatments,
                  programme,
                  visit,
                  customer.customerNumber,
                ),
            )
            .map((visit) => ({
              customerNumber:
                programme.customerNumber,

              treatmentName:
                visit.treatmentName,

              scheduledDate:
                visit.scheduledDate,
            }));
        })
        .sort((first, second) =>
          first.scheduledDate.localeCompare(
            second.scheduledDate,
          ),
        )
        .slice(0, 6);
    }, [
      programmes,
      customers,
      treatments,
    ]);

  const todayDate =
    getTodayDateValue();

  const openActions =
    actions.filter(
      (action) =>
        action.status === "Open",
    );

  const overdueActions =
    openActions.filter(
      (action) =>
        Boolean(action.dueDate) &&
        action.dueDate < todayDate,
    );

  const dueTodayActions =
    openActions.filter(
      (action) =>
        action.dueDate === todayDate,
    );

  const urgentOpenActions =
    openActions.filter(
      (action) =>
        action.priority === "Urgent",
    );

  const actionsNeedingAttention =
    [...openActions]
      .filter(
        (action) =>
          Boolean(action.dueDate) &&
          action.dueDate <= todayDate,
      )
      .sort((first, second) => {
        if (
          first.priority === "Urgent" &&
          second.priority !== "Urgent"
        ) {
          return -1;
        }

        if (
          first.priority !== "Urgent" &&
          second.priority === "Urgent"
        ) {
          return 1;
        }

        return (
          first.dueDate || "9999-12-31"
        ).localeCompare(
          second.dueDate || "9999-12-31",
        );
      })
      .slice(0, 5);

  const enquiryAttentionCount =
    newEnquiries.length +
    outstandingQuotes.length +
    acceptedEnquiries.length;

  const totalAttentionItems =
    reschedulingRecords.length +
    lowStockProducts.length +
    customersWithoutProgramme.length +
    enquiryAttentionCount;

  const unscheduledAdditionalJobs =
    activeCustomers.flatMap((customer) =>
      (customer.additionalJobs ?? [])
        .filter((job) => job.status === "Unscheduled")
        .map((job) => ({ customer, job })),
    );

  const workflowAttentionItems = [
    {
      key: "actions-overdue",
      title: "Overdue customer actions",
      detail: "Follow-ups that have passed their due date.",
      count: overdueActions.length,
      href: "/actions",
      actionLabel: "Deal with overdue actions",
      severity: "danger" as const,
      priority: "now" as const,
    },
    {
      key: "actions-today",
      title: "Customer actions due today",
      detail: "Open follow-ups that need dealing with today.",
      count: dueTodayActions.length,
      href: "/actions",
      actionLabel: "Open today's actions",
      severity: "warning" as const,
      priority: "now" as const,
    },
    {
      key: "rescheduling",
      title: "Visits needing rescheduling",
      detail: "Programme visits that need a replacement working date.",
      count: reschedulingRecords.length,
      href: "/jobs?view=reschedule",
      actionLabel: "Reschedule visits",
      severity: "warning" as const,
      priority: "now" as const,
    },
    {
      key: "stock",
      title: "Products at reorder level",
      detail: "Active products at or below their reorder level.",
      count: lowStockProducts.length,
      href: "/stock",
      actionLabel: "Review stock",
      severity: "danger" as const,
      priority: "now" as const,
    },
    {
      key: "communications",
      title: "Tomorrow's reminders not prepared",
      detail: "Programme visits or Additional Jobs not yet queued or sent.",
      count: tomorrowReminderSummary.needsAttention,
      href: `/communications?date=${tomorrowDate}`,
      actionLabel: "Prepare reminders",
      severity: "warning" as const,
      priority: "next" as const,
    },
    {
      key: "additional-unscheduled",
      title: "Unscheduled Additional Jobs",
      detail: "Additional work waiting for a working date.",
      count: unscheduledAdditionalJobs.length,
      href: "/additional-jobs",
      actionLabel: "Schedule jobs",
      severity: "information" as const,
      priority: "ahead" as const,
    },
    {
      key: "enquiries",
      title: "Enquiries needing progress",
      detail: "New enquiries, outstanding quotes or accepted quotes to convert.",
      count: enquiryAttentionCount,
      href: "/enquiries",
      actionLabel: "Progress enquiries",
      severity: "information" as const,
      priority: "ahead" as const,
    },
    {
      key: "programmes",
      title: "Active customers without programme",
      detail: "Active customers not linked to a programme for the current year.",
      count: customersWithoutProgramme.length,
      href: "/programmes",
      actionLabel: "Review programmes",
      severity: "warning" as const,
      priority: "ahead" as const,
    },
  ].filter((item) => item.count > 0);

  const workflowDoNowItems =
    workflowAttentionItems.filter(
      (item) => item.priority === "now",
    );

  const workflowPrepareNextItems =
    workflowAttentionItems.filter(
      (item) => item.priority === "next",
    );

  const workflowPlanAheadItems =
    workflowAttentionItems.filter(
      (item) => item.priority === "ahead",
    );

  const workflowAttentionCount =
    workflowAttentionItems.reduce(
      (total, item) => total + item.count,
      0,
    );

  const selectedDateProgrammeCount =
    scheduledWork.filter(
      (item) => item.source === "programme",
    ).length;

  const selectedDateAdditionalCount =
    scheduledWork.filter(
      (item) => item.source === "additional",
    ).length;

  const remainingWorkCount =
    scheduledWork.length;

  const selectedDateTotalWorkCount =
    remainingWorkCount +
    completedOnSelectedDate;

  const selectedDateWorkloadUnits =
    scheduledWork.reduce(
      (total, item) =>
        total +
        getDashboardWorkloadUnits(
          item.source,
          item.treatmentName,
        ),
      0,
    );

  const selectedDateVanCount =
    new Set(
      scheduledWork
        .map((item) => item.customer?.vanNumber)
        .filter(
          (value) =>
            value !== undefined &&
            value !== null,
        ),
    ).size;

  const selectedDateProblemRecords =
    selectedDateTreatments.filter(
      (treatment) =>
        treatment.status !== "Completed" &&
        treatment.status !== "Cancelled" &&
        treatment.status !== "Rescheduled",
    );

  const selectedDateReschedulingCount =
    selectedDateProblemRecords.filter(
      (treatment) =>
        treatment.status === "Needs Rescheduling",
    ).length;

  const selectedDateOtherProblemCount =
    selectedDateProblemRecords.length -
    selectedDateReschedulingCount;

  const closeDayOutstandingCount =
    remainingWorkCount +
    selectedDateProblemRecords.length;

  const selectedDateIsPast =
    selectedDate < todayDate;

  const selectedDateIsToday =
    selectedDate === todayDate;

  const closeDayStatus =
    closeDayOutstandingCount === 0
      ? selectedDateTotalWorkCount > 0
        ? "Complete"
        : "No work"
      : selectedDateIsPast
        ? "Needs review"
        : selectedDateIsToday
          ? "In progress"
          : "Upcoming";

  const comingNextDays =
    useMemo(() => {
      const programmeByDate = programmes.flatMap(
        (programme) => {
          const customer = customers.find(
            (record) =>
              record.customerNumber ===
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
                visit.scheduledDate > selectedDate &&
                (visit.status === "Scheduled" ||
                  visit.status === "Planned"),
            )
            .filter(
              (visit) =>
                !hasFinalRecordedOutcome(
                  treatments,
                  programme,
                  visit,
                  customer.customerNumber,
                ),
            )
            .map((visit) => ({
              date: visit.scheduledDate,
              source: "programme" as const,
              treatmentName: visit.treatmentName,
              customer,
              price: customer.treatmentPrice ?? 0,
            }));
        },
      );

      const additionalByDate =
        activeCustomers.flatMap((customer) =>
          (customer.additionalJobs ?? [])
            .filter(
              (job) =>
                job.status === "Scheduled" &&
                Boolean(job.scheduledDate) &&
                job.scheduledDate! > selectedDate,
            )
            .map((job) => ({
              date: job.scheduledDate!,
              source: "additional" as const,
              treatmentName: job.treatmentName,
              customer,
              price: job.price ?? 0,
            })),
        );

      const rows = [
        ...programmeByDate,
        ...additionalByDate,
      ];

      const dates = Array.from(
        new Set(rows.map((row) => row.date)),
      )
        .sort((first, second) =>
          first.localeCompare(second),
        )
        .slice(0, 5);

      return dates.map((date) => {
        const dayRows = rows.filter(
          (row) => row.date === date,
        );

        const programmeCount =
          dayRows.filter(
            (row) => row.source === "programme",
          ).length;

        const additionalCount =
          dayRows.filter(
            (row) => row.source === "additional",
          ).length;

        const workloadUnits =
          dayRows.reduce(
            (total, row) =>
              total +
              getDashboardWorkloadUnits(
                row.source,
                row.treatmentName,
              ),
            0,
          );

        const area =
          dayRows.reduce(
            (total, row) =>
              total + (row.customer.lawnSize ?? 0),
            0,
          );

        const revenue =
          dayRows.reduce(
            (total, row) =>
              total + row.price,
            0,
          );

        const lockedGates =
          dayRows.filter(
            (row) => row.customer.lockedGate,
          ).length;

        return {
          date,
          programmeCount,
          additionalCount,
          totalJobs: dayRows.length,
          workloadUnits,
          area,
          revenue,
          lockedGates,
          capacity:
            getDashboardCapacityRating(
              workloadUnits,
              area,
            ),
        };
      });
    }, [
      activeCustomers,
      customers,
      programmes,
      selectedDate,
      treatments,
    ]);

  const ready =
    customersReady &&
    enquiriesReady &&
    programmesReady &&
    treatmentsReady &&
    chemicalsReady &&
    actionsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading GreenFlow
            dashboard...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#176b37]">
                Sharpes Lawn Care
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Operations Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Customers, enquiries,
                scheduled work and
                business activity in one
                place.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Working date
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate((current) =>
                        shiftDateValue(current, -1),
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    aria-label="Previous day"
                  >
                    ← Previous
                  </button>

                  <div className="min-w-[190px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-slate-800">
                    {formatDateWithDay(selectedDate)}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate(
                        getTodayDateValue(),
                      )
                    }
                    className="rounded-xl border border-[#338b45] bg-green-50 px-4 py-2.5 text-sm font-semibold text-[#176b37] transition hover:bg-green-100"
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate((current) =>
                        shiftDateValue(current, 1),
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    aria-label="Next day"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <Link
                href="/enquiries"
                className="rounded-xl border border-[#338b45] bg-white px-5 py-2.5 text-sm font-semibold text-[#176b37] transition hover:bg-green-50"
              >
                New Enquiry
              </Link>

              <Link
                href={`/jobs?date=${selectedDate}`}
                className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125b2f]"
              >
                Open jobs for this date
              </Link>
            </div>
          </header>

          {scheduledWork.length === 0 && (
            <section className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
              No jobs are scheduled for{" "}
              <strong>
                {formatDateWithDay(
                  selectedDate,
                )}
              </strong>
              . You can still review the rest of the
              dashboard or scroll to another date.
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Scheduled jobs"
              value={String(
                scheduledWork.length,
              )}
              detail={
                selectedDate
                  ? formatShortDate(
                      selectedDate,
                    )
                  : "No date selected"
              }
            />

            <MetricCard
              label="Completed"
              value={`${completedOnSelectedDate}/${
                scheduledWork.length +
                completedOnSelectedDate
              }`}
              detail="Recorded on selected date"
            />

            <MetricCard
              label="Scheduled area"
              value={`${totalScheduledArea.toLocaleString(
                "en-GB",
              )} m²`}
              detail="Active customer lawns"
            />

            <MetricCard
              label="Expected income"
              value={`£${expectedIncome.toFixed(
                2,
              )}`}
              detail="Programme + additional prices"
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                  Daily workflow
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Needs attention
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  One operational list for the things GreenFlow has identified
                  that need action now or preparation for the next working day.
                </p>
              </div>

              <div
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  workflowAttentionCount > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {workflowAttentionCount > 0
                  ? `${workflowAttentionCount} to deal with`
                  : "All clear"}
              </div>
            </div>

            {workflowAttentionItems.length > 0 ? (
              <div className="mt-4 space-y-4">
                {workflowDoNowItems.length > 0 && (
                  <WorkflowPriorityGroup
                    label="Do now"
                    detail="Items that are overdue, due today or need operational intervention."
                    tone="danger"
                    items={workflowDoNowItems}
                  />
                )}

                {workflowPrepareNextItems.length > 0 && (
                  <WorkflowPriorityGroup
                    label="Prepare next"
                    detail="Preparation needed for the next working day."
                    tone="warning"
                    items={workflowPrepareNextItems}
                  />
                )}

                {workflowPlanAheadItems.length > 0 && (
                  <WorkflowPriorityGroup
                    label="Plan ahead"
                    detail="Important work to progress when today's operational priorities are under control."
                    tone="information"
                    items={workflowPlanAheadItems}
                  />
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                Nothing currently needs operational attention.
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <WorkflowLink
                href={`/jobs?date=${selectedDate}`}
                label="Today's Jobs"
              />
              <WorkflowLink
                href={`/routes?date=${selectedDate}`}
                label="Groups & Routes"
              />
              <WorkflowLink
                href={`/visit-centre?date=${selectedDate}`}
                label="Visit Centre"
              />
              <WorkflowLink
                href="/actions"
                label="Action Centre"
              />
              <WorkflowLink
                href="/additional-jobs"
                label="Additional Jobs"
              />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-green-200 bg-green-50/60 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                  Today&apos;s work status
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {formatDateWithDay(selectedDate)}
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Live operational position for the selected working date,
                  combining programme work and scheduled Additional Jobs.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <WorkflowLink
                  href={`/jobs?date=${selectedDate}`}
                  label="Open Jobs"
                />
                <WorkflowLink
                  href={`/routes?date=${selectedDate}`}
                  label="Groups & Routes"
                />
                <WorkflowLink
                  href={`/visit-centre?date=${selectedDate}`}
                  label="Visit Centre"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <WorkStatusMetric
                label="Programme"
                value={String(selectedDateProgrammeCount)}
                detail="Remaining visits"
              />

              <WorkStatusMetric
                label="Additional"
                value={String(selectedDateAdditionalCount)}
                detail="Remaining jobs"
              />

              <WorkStatusMetric
                label="Completed"
                value={String(completedOnSelectedDate)}
                detail={`Of ${selectedDateTotalWorkCount} recorded / remaining`}
                positive={completedOnSelectedDate > 0}
              />

              <WorkStatusMetric
                label="Remaining"
                value={String(remainingWorkCount)}
                detail="Still to complete"
                warning={remainingWorkCount > 0}
              />

              <WorkStatusMetric
                label="Workload"
                value={`${selectedDateWorkloadUnits} units`}
                detail="Programme 1 · additional weighted"
              />

              <WorkStatusMetric
                label="Area"
                value={`${totalScheduledArea.toLocaleString("en-GB")} m²`}
                detail="Remaining scheduled lawns"
              />

              <WorkStatusMetric
                label="Revenue"
                value={`£${expectedIncome.toFixed(2)}`}
                detail="Remaining scheduled value"
              />

              <WorkStatusMetric
                label="Access"
                value={String(lockedGateCount)}
                detail={
                  lockedGateCount === 1
                    ? "Locked gate warning"
                    : "Locked gate warnings"
                }
                danger={lockedGateCount > 0}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-green-200 pt-4 text-xs text-slate-600">
              <span>
                <strong className="text-slate-900">
                  {selectedDateVanCount}
                </strong>{" "}
                {selectedDateVanCount === 1 ? "van" : "vans"} represented
              </span>

              <span>
                <strong className="text-slate-900">
                  {scheduledWork.length}
                </strong>{" "}
                jobs currently remaining
              </span>

              <span>
                Aeration = 2 units · Scarification = 3 · Overseeding = 2
              </span>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
                  Close the day
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  End-of-day check
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Check that the selected working date is operationally closed
                  before moving on. GreenFlow highlights work still waiting for
                  completion and recorded outcomes that need review.
                </p>
              </div>

              <CloseDayStatusBadge status={closeDayStatus} />
            </div>

            <div className="mt-4 rounded-xl border border-indigo-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
                    Working day workflow
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    Stage 4 of 4 · {formatDateWithDay(selectedDate)}
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  Review the day before moving on
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <WorkingDayStage
                  number="1"
                  title="Review Jobs"
                  detail="Review the selected date workload."
                  href={`/jobs?date=${selectedDate}`}
                  state="complete"
                />

                <WorkingDayStage
                  number="2"
                  title="Groups & Routes"
                  detail="Review the saved route and working order."
                  href={`/routes?date=${selectedDate}`}
                  state="complete"
                />

                <WorkingDayStage
                  number="3"
                  title="Visit Centre"
                  detail="Record visit outcomes and completed work."
                  href={`/visit-centre?date=${selectedDate}`}
                  state="complete"
                />

                <WorkingDayStage
                  number="4"
                  title="Close Day"
                  detail={
                    closeDayOutstandingCount === 0
                      ? "End-of-day check is clear."
                      : `${closeDayOutstandingCount} item${
                          closeDayOutstandingCount === 1 ? "" : "s"
                        } still need attention.`
                  }
                  href={`/?date=${selectedDate}`}
                  state="current"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <CloseDayMetric
                label="Planned"
                value={String(selectedDateTotalWorkCount)}
                detail="Recorded plus remaining work"
              />

              <CloseDayMetric
                label="Completed"
                value={String(completedOnSelectedDate)}
                detail="Completed treatment records"
                positive={
                  completedOnSelectedDate > 0 &&
                  remainingWorkCount === 0
                }
              />

              <CloseDayMetric
                label="Still to complete"
                value={String(remainingWorkCount)}
                detail="Scheduled work still open"
                warning={remainingWorkCount > 0}
              />

              <CloseDayMetric
                label="Needs rescheduling"
                value={String(selectedDateReschedulingCount)}
                detail="Recorded outcomes to move"
                danger={selectedDateReschedulingCount > 0}
              />

              <CloseDayMetric
                label="Other outcomes"
                value={String(selectedDateOtherProblemCount)}
                detail="Non-completed records to review"
                warning={selectedDateOtherProblemCount > 0}
              />
            </div>

            {closeDayOutstandingCount === 0 ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                {selectedDateTotalWorkCount > 0
                  ? "This working day is clear: no scheduled work or recorded problem outcomes remain outstanding."
                  : "There is no scheduled or recorded work to close for this date."}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
                <div className="font-bold text-slate-950">
                  {closeDayOutstandingCount} item
                  {closeDayOutstandingCount === 1 ? "" : "s"} still need attention
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Complete remaining visits in Visit Centre. If a visit could
                  not be completed, make sure its outcome is recorded and any
                  required replacement date is handled in Jobs.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-indigo-200 pt-4">
              <WorkflowLink
                href={`/visit-centre?date=${selectedDate}`}
                label="Finish in Visit Centre"
              />
              <WorkflowLink
                href={`/jobs?date=${selectedDate}`}
                label="Review Jobs"
              />
              {selectedDateReschedulingCount > 0 && (
                <WorkflowLink
                  href={`/jobs?date=${selectedDate}&view=reschedule`}
                  label="Reschedule visits"
                />
              )}
              <WorkflowLink
                href="/actions"
                label="Check Action Centre"
              />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Coming next
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Upcoming working days
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  The next scheduled working days after the selected date,
                  with workload, area, revenue and capacity warnings visible
                  before the diary becomes overloaded.
                </p>
              </div>

              <Link
                href="/capacity"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-[#338b45] hover:bg-green-50 hover:text-[#176b37]"
              >
                Open Working Day Capacity
              </Link>
            </div>

            {comingNextDays.length === 0 ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                No later scheduled working days are currently recorded.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr_1fr_1fr_1fr_0.85fr_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
                  <span>Date</span>
                  <span>Programme</span>
                  <span>Additional</span>
                  <span>Jobs</span>
                  <span>Workload</span>
                  <span>Area</span>
                  <span>Revenue</span>
                  <span>Capacity</span>
                  <span />
                </div>

                <div className="divide-y divide-slate-100">
                  {comingNextDays.map((day) => (
                    <div
                      key={day.date}
                      className="grid gap-3 px-4 py-4 xl:grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr_1fr_1fr_1fr_0.85fr_110px] xl:items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-950">
                          {formatDateWithDay(day.date)}
                        </div>

                        {day.lockedGates > 0 && (
                          <div className="mt-1 text-xs font-bold text-red-700">
                            {day.lockedGates} locked gate
                            {day.lockedGates === 1 ? "" : "s"}
                          </div>
                        )}
                      </div>

                      <ComingNextValue
                        label="Programme"
                        value={String(day.programmeCount)}
                      />

                      <ComingNextValue
                        label="Additional"
                        value={String(day.additionalCount)}
                      />

                      <ComingNextValue
                        label="Jobs"
                        value={String(day.totalJobs)}
                      />

                      <ComingNextValue
                        label="Workload"
                        value={`${day.workloadUnits} units`}
                      />

                      <ComingNextValue
                        label="Area"
                        value={`${day.area.toLocaleString("en-GB")} m²`}
                      />

                      <ComingNextValue
                        label="Revenue"
                        value={`£${day.revenue.toFixed(2)}`}
                      />

                      <div>
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
                          Capacity
                        </div>
                        <CapacityBadge rating={day.capacity} />
                      </div>

                      <Link
                        href={`/jobs?date=${day.date}`}
                        className="inline-flex justify-center rounded-xl border border-[#338b45] bg-white px-3 py-2 text-sm font-bold text-[#176b37] transition hover:bg-green-50"
                      >
                        Open day
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  Customer communications
                </div>

                <h2 className="mt-1 text-xl font-bold text-blue-950">
                  Tomorrow&apos;s reminders
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-900">
                  {formatDateWithDay(
                    tomorrowDate,
                  )} · Programme visits and scheduled Additional Jobs.
                </p>
              </div>

              <Link
                href={`/communications?date=${tomorrowDate}`}
                className="inline-flex h-11 items-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                Prepare tomorrow&apos;s reminders
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ReminderMetric
                label="Scheduled"
                value={
                  tomorrowReminderSummary.scheduled
                }
                detail="Customers due tomorrow"
              />

              <ReminderMetric
                label="Need attention"
                value={
                  tomorrowReminderSummary.needsAttention
                }
                detail="Not queued or sent"
                warning={
                  tomorrowReminderSummary.needsAttention >
                  0
                }
              />

              <ReminderMetric
                label="Queued"
                value={
                  tomorrowReminderSummary.queued
                }
                detail="Ready to contact"
              />

              <ReminderMetric
                label="Sent"
                value={
                  tomorrowReminderSummary.sent
                }
                detail="Already contacted"
              />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  Action Centre
                </div>

                <h2 className="mt-1 text-xl font-bold text-amber-950">
                  Actions needing attention
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-900">
                  Customer follow-ups due today or already overdue.
                </p>
              </div>

              <Link
                href="/actions"
                className="inline-flex h-11 items-center rounded-xl bg-amber-700 px-5 text-sm font-bold text-white transition hover:bg-amber-800"
              >
                Open Action Centre
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ActionMetric
                label="Overdue"
                value={overdueActions.length}
                detail="Past their due date"
                warning={
                  overdueActions.length > 0
                }
              />

              <ActionMetric
                label="Due today"
                value={dueTodayActions.length}
                detail="Need dealing with today"
                warning={
                  dueTodayActions.length > 0
                }
              />

              <ActionMetric
                label="Urgent open"
                value={urgentOpenActions.length}
                detail="Urgent priority"
                warning={
                  urgentOpenActions.length > 0
                }
              />

              <ActionMetric
                label="Open actions"
                value={openActions.length}
                detail="All outstanding follow-ups"
              />
            </div>

            {actionsNeedingAttention.length > 0 ? (
              <div className="mt-4 divide-y divide-amber-200 overflow-hidden rounded-xl border border-amber-200 bg-white">
                {actionsNeedingAttention.map(
                  (action) => {
                    const overdue =
                      Boolean(
                        action.dueDate,
                      ) &&
                      action.dueDate <
                        todayDate;

                    return (
                      <div
                        key={action.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/customers/${action.customerNumber}?tab=actions`}
                              className="font-bold text-slate-950 hover:text-[#176b37]"
                            >
                              {action.customerName ||
                                `Customer ${action.customerNumber}`}
                            </Link>

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                              {action.type}
                            </span>

                            {action.priority ===
                              "Urgent" && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                Urgent
                              </span>
                            )}
                          </div>

                          <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                            {action.note}
                          </p>
                        </div>

                        <div
                          className={`shrink-0 text-xs font-bold ${
                            overdue
                              ? "text-red-700"
                              : "text-amber-800"
                          }`}
                        >
                          {overdue
                            ? "Overdue · "
                            : "Due today · "}
                          {formatShortDate(
                            action.dueDate,
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-sm font-semibold text-green-800">
                Nothing overdue or due today.
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                  Additional Jobs
                </div>

                <h2 className="mt-1 text-xl font-bold text-emerald-950">
                  Additional work pipeline
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-900">
                  Scarification, Aeration, Overseeding and future additional services remain separate from the five-treatment seasonal programme until they are scheduled.
                </p>
              </div>

              <Link
                href="/additional-jobs"
                className="inline-flex h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Open Additional Jobs Planner
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdditionalJobMetric
                label="Unscheduled"
                value={String(
                  additionalJobSummary.unscheduledCount,
                )}
                detail="Waiting to allocate"
                warning={
                  additionalJobSummary.unscheduledCount >
                  0
                }
              />

              <AdditionalJobMetric
                label="Waiting value"
                value={`£${additionalJobSummary.unscheduledValue.toFixed(
                  2,
                )}`}
                detail="Unscheduled work"
                warning={
                  additionalJobSummary.unscheduledValue >
                  0
                }
              />

              <AdditionalJobMetric
                label="Scheduled upcoming"
                value={String(
                  additionalJobSummary.scheduledCount,
                )}
                detail="Booked into working days"
              />

              <AdditionalJobMetric
                label="Scheduled value"
                value={`£${additionalJobSummary.scheduledValue.toFixed(
                  2,
                )}`}
                detail="Upcoming additional work"
              />

              <AdditionalJobMetric
                label="On selected date"
                value={String(
                  additionalJobSummary.selectedDateCount,
                )}
                detail={`£${additionalJobSummary.selectedDateValue.toFixed(
                  2,
                )} · ${formatShortDate(
                  selectedDate,
                )}`}
              />
            </div>
          </section>

        </div>
      </main>
    </AppShell>
  );
}

function WorkingDayStage({
  number,
  title,
  detail,
  href,
  state,
}: {
  number: string;
  title: string;
  detail: string;
  href: string;
  state: "complete" | "current";
}) {
  const styles =
    state === "current"
      ? "border-indigo-300 bg-indigo-50"
      : "border-slate-200 bg-white";

  const badgeStyles =
    state === "current"
      ? "bg-indigo-700 text-white"
      : "bg-green-100 text-green-800";

  return (
    <Link
      href={href}
      className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${styles}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${badgeStyles}`}
        >
          {state === "complete" ? "✓" : number}
        </span>

        <div className="min-w-0">
          <div className="font-bold text-slate-950">
            {title}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            {detail}
          </p>

          <div className="mt-3 text-xs font-black text-slate-700">
            {state === "current" ? "Current stage" : "Open stage"}
            {state !== "current" && (
              <span className="ml-1 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function getDashboardCapacityRating(
  workloadUnits: number,
  area: number,
):
  | "Normal"
  | "Busy"
  | "Big day"
  | "Very busy" {
  if (
    workloadUnits >= 50 ||
    area >= 5500
  ) {
    return "Very busy";
  }

  if (area >= 4750) {
    return "Big day";
  }

  if (
    workloadUnits >= 40 ||
    area >= 4000
  ) {
    return "Busy";
  }

  return "Normal";
}

function getDashboardWorkloadUnits(
  source: "programme" | "additional",
  treatmentName: string,
) {
  if (source === "programme") {
    return 1;
  }

  const normalisedName =
    treatmentName.trim().toLowerCase();

  if (normalisedName.includes("scarif")) {
    return 3;
  }

  if (
    normalisedName.includes("aerat") ||
    normalisedName.includes("overseed")
  ) {
    return 2;
  }

  return 1;
}

function hasFinalRecordedOutcome(
  treatments: TreatmentRecord[],
  programme: CustomerProgramme,
  visit: ProgrammeVisit,
  customerNumber: string,
) {
  return treatments.some(
    (treatment) =>
      (
        treatment.status ===
          "Completed" ||
        treatment.status ===
          "Cancelled"
      ) &&
      (
        (
          treatment.programmeId ===
            programme.id &&
          treatment.programmeVisitId ===
            visit.id
        ) ||
        (
          !treatment.programmeVisitId &&
          treatment.customerNumber ===
            customerNumber &&
          treatment.scheduledDate ===
            visit.scheduledDate &&
          treatment.treatmentName ===
            visit.treatmentName
        )
      ),
  );
}

function shiftDateValue(
  value: string,
  days: number,
) {
  const date = parseDate(
    value || getTodayDateValue(),
  );

  date.setDate(
    date.getDate() + days,
  );

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function ActionMetric({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-amber-300 bg-amber-100"
          : "border-amber-200 bg-white"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-amber-950">
        {value}
      </div>

      <div className="mt-1 text-xs text-amber-800">
        {detail}
      </div>
    </div>
  );
}

function ReminderMetric({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-amber-300 bg-amber-50"
          : "border-violet-200 bg-white"
      }`}
    >
      <div
        className={`text-xs font-bold uppercase tracking-wide ${
          warning
            ? "text-amber-700"
            : "text-violet-700"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-1 text-2xl font-black ${
          warning
            ? "text-amber-950"
            : "text-violet-950"
        }`}
      >
        {value}
      </div>

      <div
        className={`mt-1 text-xs ${
          warning
            ? "text-amber-800"
            : "text-violet-700"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}

function AdditionalJobMetric({
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
    <article
      className={`rounded-xl border p-4 ${
        warning
          ? "border-amber-300 bg-white"
          : "border-amber-200 bg-white/80"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  detail,
  accent = "default",
}: {
  label: string;
  value: string;
  detail: string;

  accent?:
    | "default"
    | "green"
    | "blue"
    | "amber";
}) {
  const accentClass =
    accent === "green"
      ? "bg-green-500"
      : accent === "blue"
        ? "bg-blue-500"
        : accent === "amber"
          ? "bg-amber-500"
          : "bg-[#338b45]";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${accentClass}`}
      />

      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function SummaryPill({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        warning
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {label}: {value}
    </span>
  );
}

function CloseDayMetric({
  label,
  value,
  detail,
  warning = false,
  danger = false,
  positive = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
  danger?: boolean;
  positive?: boolean;
}) {
  const styles = danger
    ? "border-red-200 bg-red-50"
    : warning
      ? "border-amber-200 bg-amber-50"
      : positive
        ? "border-green-200 bg-green-50"
        : "border-indigo-200 bg-white";

  const valueStyle = danger
    ? "text-red-800"
    : warning
      ? "text-amber-900"
      : positive
        ? "text-green-800"
        : "text-slate-950";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">
        {label}
      </div>

      <div className={`mt-1 text-xl font-black ${valueStyle}`}>
        {value}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-600">
        {detail}
      </div>
    </div>
  );
}

function CloseDayStatusBadge({
  status,
}: {
  status:
    | "Complete"
    | "No work"
    | "Needs review"
    | "In progress"
    | "Upcoming";
}) {
  const styles =
    status === "Complete"
      ? "bg-green-100 text-green-800"
      : status === "Needs review"
        ? "bg-red-100 text-red-700"
        : status === "In progress"
          ? "bg-amber-100 text-amber-800"
          : status === "Upcoming"
            ? "bg-blue-100 text-blue-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${styles}`}
    >
      {status}
    </span>
  );
}

function ComingNextValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
        {label}
      </div>

      <div className="font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function CapacityBadge({
  rating,
}: {
  rating:
    | "Normal"
    | "Busy"
    | "Big day"
    | "Very busy";
}) {
  const styles =
    rating === "Very busy"
      ? "bg-red-100 text-red-700"
      : rating === "Big day"
        ? "bg-orange-100 text-orange-800"
        : rating === "Busy"
          ? "bg-amber-100 text-amber-800"
          : "bg-green-100 text-green-800";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${styles}`}
    >
      {rating}
    </span>
  );
}

function WorkStatusMetric({
  label,
  value,
  detail,
  warning = false,
  danger = false,
  positive = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
  danger?: boolean;
  positive?: boolean;
}) {
  const styles = danger
    ? "border-red-200 bg-red-50"
    : warning
      ? "border-amber-200 bg-amber-50"
      : positive
        ? "border-green-300 bg-green-100"
        : "border-green-200 bg-white";

  const valueStyle = danger
    ? "text-red-800"
    : warning
      ? "text-amber-900"
      : "text-slate-950";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-[#176b37]">
        {label}
      </div>

      <div className={`mt-1 text-xl font-black ${valueStyle}`}>
        {value}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-600">
        {detail}
      </div>
    </div>
  );
}

function WorkflowPriorityGroup({
  label,
  detail,
  tone,
  items,
}: {
  label: string;
  detail: string;
  tone: "danger" | "warning" | "information";
  items: Array<{
    key: string;
    title: string;
    detail: string;
    count: number;
    href: string;
    actionLabel: string;
    severity: "danger" | "warning" | "information";
    priority: "now" | "next" | "ahead";
  }>;
}) {
  const headingStyles =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-blue-200 bg-blue-50 text-blue-900";

  const count = items.reduce(
    (total, item) => total + item.count,
    0,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${headingStyles}`}
      >
        <div>
          <div className="font-black">{label}</div>
          <div className="mt-0.5 text-xs opacity-80">
            {detail}
          </div>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <WorkflowAttentionCard
            key={item.key}
            title={item.title}
            detail={item.detail}
            count={item.count}
            href={item.href}
            actionLabel={item.actionLabel}
            severity={item.severity}
          />
        ))}
      </div>
    </div>
  );
}

function WorkflowAttentionCard({
  title,
  detail,
  count,
  href,
  actionLabel,
  severity,
}: {
  title: string;
  detail: string;
  count: number;
  href: string;
  actionLabel: string;
  severity: "danger" | "warning" | "information";
}) {
  const styles =
    severity === "danger"
      ? "border-red-200 bg-red-50 text-red-950"
      : severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-blue-200 bg-blue-50 text-blue-950";

  const actionStyles =
    severity === "danger"
      ? "text-red-800"
      : severity === "warning"
        ? "text-amber-900"
        : "text-blue-900";

  return (
    <Link
      href={href}
      className={`group flex min-h-[150px] flex-col rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${styles}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-60">
            Next step
          </div>
          <div className="mt-1 font-bold">{title}</div>
        </div>

        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-sm font-black">
          {count}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 opacity-80">
        {detail}
      </p>

      <div
        className={`mt-auto pt-4 text-sm font-black ${actionStyles}`}
      >
        {actionLabel}
        <span className="ml-1 inline-block transition group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </Link>
  );
}

function WorkflowLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#338b45] hover:bg-green-50 hover:text-[#176b37]"
    >
      {label}
    </Link>
  );
}

function AttentionItem({
  title,
  count,
  href,
  severity,
}: {
  title: string;
  count: number;
  href: string;

  severity:
    | "danger"
    | "warning"
    | "information";
}) {
  const styles =
    count === 0
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : severity === "danger"
        ? "border-red-200 bg-red-50 text-red-900"
        : severity === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-blue-200 bg-blue-50 text-blue-900";

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:brightness-[0.98] ${styles}`}
    >
      <span className="text-sm font-semibold">
        {title}
      </span>

      <span className="text-xl font-bold">
        {count}
      </span>
    </Link>
  );
}

function DashboardPanel({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <Link
          href={actionHref}
          className="text-xs font-bold text-[#176b37] hover:underline"
        >
          {actionLabel}
        </Link>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </article>
  );
}

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function TreatmentStatusBadge({
  status,
}: {
  status: TreatmentStatus;
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Rescheduled"
        ? "bg-blue-100 text-blue-800"
        : status ===
            "Needs Rescheduling"
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-700";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function EnquiryStatusBadge({
  status,
}: {
  status:
    | "New Enquiry"
    | "Visit Arranged"
    | "Quote Prepared"
    | "Quote Accepted"
    | "Quote Declined"
    | "Converted to Customer"
    | "Closed";
}) {
  const styles =
    status ===
      "Converted to Customer" ||
    status === "Quote Accepted"
      ? "bg-green-100 text-green-800"
      : status ===
            "Quote Declined" ||
          status === "Closed"
        ? "bg-red-100 text-red-700"
        : status ===
            "Quote Prepared"
          ? "bg-blue-100 text-blue-800"
          : status ===
              "Visit Arranged"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function PipelineCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: number;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}
function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}