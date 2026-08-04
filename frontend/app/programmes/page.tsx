"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  type ProgrammeVisitStatus,
  useProgrammeStore,
} from "@/components/programme-store";
import { STANDARD_TREATMENTS } from "@/lib/standard-treatments";

type GeneratorSettings = {
  customerNumber: string;
  programmeYear: number;
  programmeName: string;
  startDate: string;
  gap1: number;
  gap2: number;
  gap3: number;
  gap4: number;
  avoidWednesdays: boolean;
  avoidWeekends: boolean;
};

export default function ProgrammesPage() {
  const {
    customers,
    ready: customersReady,
    updateCustomer,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
    saveProgramme,
    deleteProgramme,
    getProgrammeForCustomer,
  } = useProgrammeStore();

  const activeCustomers = useMemo(
    () =>
      customers
        .filter(
          (customer) =>
            customer.status === "Active",
        )
        .sort((first, second) =>
          first.fullName.localeCompare(
            second.fullName,
          ),
        ),
    [customers],
  );

  const defaultCustomer =
    activeCustomers[0];

  const currentYear =
    new Date().getFullYear();

  const [settings, setSettings] =
    useState<GeneratorSettings>({
      customerNumber:
        defaultCustomer?.customerNumber ??
        "",
      programmeYear: currentYear,
      programmeName:
        "Standard annual programme",
      startDate: `${currentYear}-01-15`,
      gap1:
        STANDARD_TREATMENTS[1]
          .gapAfterPreviousDays,
      gap2:
        STANDARD_TREATMENTS[2]
          .gapAfterPreviousDays,
      gap3:
        STANDARD_TREATMENTS[3]
          .gapAfterPreviousDays,
      gap4:
        STANDARD_TREATMENTS[4]
          .gapAfterPreviousDays,
      avoidWednesdays: true,
      avoidWeekends: true,
    });

  const [draftVisits, setDraftVisits] =
    useState<ProgrammeVisit[]>([]);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (
      settings.customerNumber ||
      activeCustomers.length === 0
    ) {
      return;
    }

    setSettings((current) => ({
      ...current,
      customerNumber:
        activeCustomers[0].customerNumber,
    }));
  }, [
    activeCustomers,
    settings.customerNumber,
  ]);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.customerNumber ===
        settings.customerNumber,
    );

  const existingProgramme =
    getProgrammeForCustomer(
      settings.customerNumber,
      settings.programmeYear,
    );

  const filteredProgrammes = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return programmes
      .filter((programme) => {
        const customer = customers.find(
          (item) =>
            item.customerNumber ===
            programme.customerNumber,
        );

        if (!query) {
          return true;
        }

        return [
          programme.customerNumber,
          programme.programmeName,
          String(programme.year),
          customer?.fullName ?? "",
          customer?.address ?? "",
          customer?.postcode ?? "",
        ].some((value) =>
          value
            .toLowerCase()
            .includes(query),
        );
      })
      .sort(
        (first, second) =>
          second.year - first.year,
      );
  }, [
    programmes,
    customers,
    search,
  ]);

  const annualValue = selectedCustomer
    ? selectedCustomer.treatmentPrice *
      draftVisits.filter(
        (visit) =>
          visit.status !== "Skipped",
      ).length
    : 0;

  function generateProgramme() {
    if (!selectedCustomer) {
      showMessage(
        "Select a customer first.",
      );
      return;
    }

    if (!settings.startDate) {
      showMessage(
        "Choose a programme start date.",
      );
      return;
    }

    const generatedVisits =
      buildProgrammeVisits(settings);

    setDraftVisits(generatedVisits);

    showMessage(
      `${generatedVisits.length} treatment visits generated.`,
    );
  }

  function loadExistingProgramme() {
    if (!existingProgramme) {
      showMessage(
        "No saved programme exists for this customer and year.",
      );
      return;
    }

    setSettings((current) => ({
      ...current,
      programmeName:
        existingProgramme.programmeName,
      startDate:
        existingProgramme.startDate,
      avoidWednesdays:
        existingProgramme.avoidWednesdays,
      avoidWeekends:
        existingProgramme.avoidWeekends,
      gap1:
        existingProgramme.visits[1]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[1]
          .gapAfterPreviousDays,
      gap2:
        existingProgramme.visits[2]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[2]
          .gapAfterPreviousDays,
      gap3:
        existingProgramme.visits[3]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[3]
          .gapAfterPreviousDays,
      gap4:
        existingProgramme.visits[4]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[4]
          .gapAfterPreviousDays,
    }));

    setDraftVisits(
      existingProgramme.visits.map(
        (visit) => ({ ...visit }),
      ),
    );

    showMessage(
      "Saved programme loaded.",
    );
  }

  function saveGeneratedProgramme() {
    if (!selectedCustomer) {
      showMessage(
        "Select a customer first.",
      );
      return;
    }

    if (draftVisits.length === 0) {
      showMessage(
        "Generate the programme before saving it.",
      );
      return;
    }

    const programme: CustomerProgramme = {
      id:
        existingProgramme?.id ??
        `programme-${settings.customerNumber}-${settings.programmeYear}`,
      customerNumber:
        settings.customerNumber,
      year: settings.programmeYear,
      createdAt:
        existingProgramme?.createdAt ??
        new Date().toISOString(),
      programmeName:
        settings.programmeName.trim() ||
        "Standard annual programme",
      startDate: settings.startDate,
      avoidWednesdays:
        settings.avoidWednesdays,
      avoidWeekends:
        settings.avoidWeekends,
      visits: draftVisits,
    };

    saveProgramme(programme);

    const firstUpcomingVisit =
      draftVisits.find(
        (visit) =>
          visit.status === "Scheduled" ||
          visit.status === "Planned",
      );

    if (firstUpcomingVisit) {
      updateCustomer({
        ...selectedCustomer,
        nextVisit: formatDate(
          firstUpcomingVisit.scheduledDate,
        ),
      });
    }

    showMessage(
      `Programme saved for ${selectedCustomer.fullName}.`,
    );
  }

  function moveVisit(
    visitId: string,
    days: number,
  ) {
    setDraftVisits((current) =>
      current.map((visit) => {
        if (visit.id !== visitId) {
          return visit;
        }

        let movedDate = addDays(
          parseDate(
            visit.scheduledDate,
          ),
          days,
        );

        movedDate = moveToWorkingDay(
          movedDate,
          settings.avoidWednesdays,
          settings.avoidWeekends,
        );

        return {
          ...visit,
          scheduledDate:
            toDateValue(movedDate),
        };
      }),
    );
  }

  function updateVisitStatus(
    visitId: string,
    status: ProgrammeVisitStatus,
  ) {
    setDraftVisits((current) =>
      current.map((visit) =>
        visit.id === visitId
          ? {
              ...visit,
              status,
            }
          : visit,
      ),
    );
  }

  function updateVisitDate(
    visitId: string,
    date: string,
  ) {
    setDraftVisits((current) =>
      current.map((visit) =>
        visit.id === visitId
          ? {
              ...visit,
              scheduledDate: date,
            }
          : visit,
      ),
    );
  }

  function deleteSelectedProgramme() {
    if (!existingProgramme) {
      showMessage(
        "No saved programme exists to delete.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete the ${existingProgramme.year} programme for ${selectedCustomer?.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    deleteProgramme(
      existingProgramme.id,
    );

    setDraftVisits([]);

    showMessage(
      "Customer programme deleted.",
    );
  }

  function selectSavedProgramme(
    programme: CustomerProgramme,
  ) {
    setSettings({
      customerNumber:
        programme.customerNumber,
      programmeYear: programme.year,
      programmeName:
        programme.programmeName,
      startDate: programme.startDate,
      gap1:
        programme.visits[1]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[1]
          .gapAfterPreviousDays,
      gap2:
        programme.visits[2]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[2]
          .gapAfterPreviousDays,
      gap3:
        programme.visits[3]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[3]
          .gapAfterPreviousDays,
      gap4:
        programme.visits[4]
          ?.gapAfterPreviousDays ??
        STANDARD_TREATMENTS[4]
          .gapAfterPreviousDays,
      avoidWednesdays:
        programme.avoidWednesdays,
      avoidWeekends:
        programme.avoidWeekends,
    });

    setDraftVisits(
      programme.visits.map(
        (visit) => ({ ...visit }),
      ),
    );
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2800);
  }

  if (
    !customersReady ||
    !programmesReady
  ) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading annual programmes...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5">
            <Link
              href="/"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Annual Programmes
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Generate, adjust and save each
              customer&apos;s annual treatment
              schedule.
            </p>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-[390px_1fr]">
            <aside className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">
                  Programme generator
                </h2>

                <div className="mt-5 space-y-4">
                  <Field label="Customer">
                    <select
                      value={
                        settings.customerNumber
                      }
                      onChange={(event) => {
                        setSettings(
                          (current) => ({
                            ...current,
                            customerNumber:
                              event.target
                                .value,
                          }),
                        );

                        setDraftVisits([]);
                      }}
                      className={inputClass}
                    >
                      {activeCustomers.map(
                        (customer) => (
                          <option
                            key={
                              customer.customerNumber
                            }
                            value={
                              customer.customerNumber
                            }
                          >
                            {
                              customer.customerNumber
                            }{" "}
                            — {customer.fullName}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Programme year">
                      <input
                        type="number"
                        min="2020"
                        max="2100"
                        value={
                          settings.programmeYear
                        }
                        onChange={(event) => {
                          setSettings(
                            (current) => ({
                              ...current,
                              programmeYear:
                                Number(
                                  event.target
                                    .value,
                                ) ||
                                currentYear,
                            }),
                          );

                          setDraftVisits([]);
                        }}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Start date">
                      <input
                        type="date"
                        value={
                          settings.startDate
                        }
                        onChange={(event) =>
                          setSettings(
                            (current) => ({
                              ...current,
                              startDate:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Programme name">
                    <input
                      value={
                        settings.programmeName
                      }
                      onChange={(event) =>
                        setSettings(
                          (current) => ({
                            ...current,
                            programmeName:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900">
                    Standard visits use the shared
                    treatment template. Each gap
                    remains editable.
                  </div>

                  <GapInput
                    label="Visit 1 → Visit 2"
                    value={settings.gap1}
                    onChange={(value) =>
                      setSettings(
                        (current) => ({
                          ...current,
                          gap1: value,
                        }),
                      )
                    }
                  />

                  <GapInput
                    label="Visit 2 → Visit 3"
                    value={settings.gap2}
                    onChange={(value) =>
                      setSettings(
                        (current) => ({
                          ...current,
                          gap2: value,
                        }),
                      )
                    }
                  />

                  <GapInput
                    label="Visit 3 → Visit 4"
                    value={settings.gap3}
                    onChange={(value) =>
                      setSettings(
                        (current) => ({
                          ...current,
                          gap3: value,
                        }),
                      )
                    }
                  />

                  <GapInput
                    label="Visit 4 → Visit 5"
                    value={settings.gap4}
                    onChange={(value) =>
                      setSettings(
                        (current) => ({
                          ...current,
                          gap4: value,
                        }),
                      )
                    }
                  />

                  <OptionToggle
                    label="Reserve Wednesdays"
                    description="Move generated visits to the next working day."
                    checked={
                      settings.avoidWednesdays
                    }
                    onChange={(checked) =>
                      setSettings(
                        (current) => ({
                          ...current,
                          avoidWednesdays:
                            checked,
                        }),
                      )
                    }
                  />

                  <OptionToggle
                    label="Avoid weekends"
                    description="Move Saturday and Sunday visits forward."
                    checked={
                      settings.avoidWeekends
                    }
                    onChange={(checked) =>
                      setSettings(
                        (current) => ({
                          ...current,
                          avoidWeekends:
                            checked,
                        }),
                      )
                    }
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={
                        generateProgramme
                      }
                      className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                    >
                      Generate
                    </button>

                    <button
                      type="button"
                      onClick={
                        loadExistingProgramme
                      }
                      disabled={
                        !existingProgramme
                      }
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Load saved
                    </button>
                  </div>
                </div>
              </article>
            </aside>

            <section className="min-w-0 space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedCustomer
                        ? selectedCustomer.fullName
                        : "Select a customer"}
                    </h2>

                    {selectedCustomer && (
                      <p className="mt-1 text-sm text-slate-500">
                        Customer #
                        {
                          selectedCustomer.customerNumber
                        }{" "}
                        · Group{" "}
                        {
                          selectedCustomer.groupNumber
                        }{" "}
                        · £
                        {selectedCustomer.treatmentPrice.toFixed(
                          2,
                        )}{" "}
                        per standard visit
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {existingProgramme && (
                      <span className="inline-flex h-11 items-center rounded-xl bg-green-100 px-4 text-sm font-bold text-green-800">
                        Saved programme
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={
                        saveGeneratedProgramme
                      }
                      disabled={
                        draftVisits.length ===
                        0
                      }
                      className="h-11 rounded-xl bg-[#176b37] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Save programme
                    </button>

                    <button
                      type="button"
                      onClick={
                        deleteSelectedProgramme
                      }
                      disabled={
                        !existingProgramme
                      }
                      className="h-11 rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Scheduled visits"
                    value={String(
                      draftVisits.filter(
                        (visit) =>
                          visit.status !==
                          "Skipped",
                      ).length,
                    )}
                    detail="Current programme"
                  />

                  <SummaryCard
                    label="Expected value"
                    value={`£${annualValue.toFixed(
                      2,
                    )}`}
                    detail="Standard visits only"
                  />

                  <SummaryCard
                    label="First visit"
                    value={
                      draftVisits[0]
                        ? formatShortDate(
                            draftVisits[0]
                              .scheduledDate,
                          )
                        : "Not generated"
                    }
                    detail="Programme start"
                  />

                  <SummaryCard
                    label="Final visit"
                    value={
                      draftVisits[
                        draftVisits.length -
                          1
                      ]
                        ? formatShortDate(
                            draftVisits[
                              draftVisits.length -
                                1
                            ].scheduledDate,
                          )
                        : "Not generated"
                    }
                    detail="Programme finish"
                  />
                </div>
              </article>

              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-[75px_1.4fr_170px_130px_210px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Visit</span>
                  <span>Treatment</span>
                  <span>Scheduled date</span>
                  <span>Status</span>
                  <span>Adjust</span>
                </div>

                {draftVisits.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="font-bold">
                      No programme generated
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Choose a customer and
                      programme start date, then
                      select Generate.
                    </p>
                  </div>
                ) : (
                  draftVisits.map(
                    (visit) => (
                      <div
                        key={visit.id}
                        className="grid grid-cols-[75px_1.4fr_170px_130px_210px] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-0"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#176b37] font-bold text-white">
                          {
                            visit.visitNumber
                          }
                        </div>

                        <div>
                          <div className="font-bold">
                            {
                              visit.treatmentName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {visit.visitNumber ===
                            1
                              ? "Programme starting visit"
                              : `${visit.gapAfterPreviousDays} days after previous visit`}
                          </div>
                        </div>

                        <input
                          type="date"
                          value={
                            visit.scheduledDate
                          }
                          onChange={(event) =>
                            updateVisitDate(
                              visit.id,
                              event.target
                                .value,
                            )
                          }
                          className={inputClass}
                        />

                        <select
                          value={visit.status}
                          onChange={(event) =>
                            updateVisitStatus(
                              visit.id,
                              event.target
                                .value as ProgrammeVisitStatus,
                            )
                          }
                          className={inputClass}
                        >
                          <option value="Planned">
                            Planned
                          </option>

                          <option value="Scheduled">
                            Scheduled
                          </option>

                          <option value="Completed">
                            Completed
                          </option>

                          <option value="Skipped">
                            Skipped
                          </option>
                        </select>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              moveVisit(
                                visit.id,
                                -1,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          >
                            −1 day
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveVisit(
                                visit.id,
                                1,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          >
                            +1 day
                          </button>
                        </div>
                      </div>
                    ),
                  )
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Field label="Search saved programmes">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Customer, year, address or programme"
                    className={inputClass}
                  />
                </Field>

                <div className="mt-4 max-h-[260px] overflow-y-auto rounded-xl border border-slate-200">
                  {filteredProgrammes.length ===
                  0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No saved customer
                      programmes found.
                    </div>
                  ) : (
                    filteredProgrammes.map(
                      (programme) => {
                        const customer =
                          customers.find(
                            (item) =>
                              item.customerNumber ===
                              programme.customerNumber,
                          );

                        return (
                          <button
                            key={programme.id}
                            type="button"
                            onClick={() =>
                              selectSavedProgramme(
                                programme,
                              )
                            }
                            className="grid w-full grid-cols-[100px_1.5fr_1fr_120px] gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-green-50"
                          >
                            <span className="font-bold text-[#176b37]">
                              {programme.year}
                            </span>

                            <span className="font-semibold">
                              {customer?.fullName ??
                                programme.customerNumber}
                            </span>

                            <span className="text-slate-600">
                              {
                                programme.programmeName
                              }
                            </span>

                            <span className="text-right font-semibold">
                              {
                                programme.visits
                                  .length
                              }{" "}
                              visits
                            </span>
                          </button>
                        );
                      },
                    )
                  )}
                </div>
              </article>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function buildProgrammeVisits(
  settings: GeneratorSettings,
): ProgrammeVisit[] {
  const gaps = [
    0,
    settings.gap1,
    settings.gap2,
    settings.gap3,
    settings.gap4,
  ];

  const visits: ProgrammeVisit[] = [];

  let currentDate = parseDate(
    settings.startDate,
  );

  for (
    let index = 0;
    index <
    STANDARD_TREATMENTS.length;
    index += 1
  ) {
    if (index > 0) {
      currentDate = addDays(
        currentDate,
        gaps[index],
      );
    }

    const adjustedDate =
      moveToWorkingDay(
        currentDate,
        settings.avoidWednesdays,
        settings.avoidWeekends,
      );

    visits.push({
      id: `programme-visit-${settings.customerNumber}-${settings.programmeYear}-${index + 1}`,
      visitNumber:
        STANDARD_TREATMENTS[index]
          .visitNumber,
      treatmentName:
        STANDARD_TREATMENTS[index]
          .treatmentName,
      scheduledDate:
        toDateValue(adjustedDate),
      gapAfterPreviousDays:
        gaps[index],
      status:
        "Scheduled" as ProgrammeVisitStatus,
      notes: "",
    });

    currentDate = adjustedDate;
  }

  return visits;
}

function moveToWorkingDay(
  date: Date,
  avoidWednesdays: boolean,
  avoidWeekends: boolean,
) {
  let result = new Date(date);

  while (true) {
    const day = result.getDay();

    const isWednesday =
      avoidWednesdays && day === 3;

    const isWeekend =
      avoidWeekends &&
      (day === 0 || day === 6);

    if (
      !isWednesday &&
      !isWeekend
    ) {
      return result;
    }

    result = addDays(result, 1);
  }
}

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function addDays(
  date: Date,
  numberOfDays: number,
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + numberOfDays,
  );

  return result;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function formatShortDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
    },
  ).format(parseDate(value));
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

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

function GapInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={value}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value,
              ) || 1,
            )
          }
          className={inputClass}
        />

        <span className="text-sm font-semibold text-slate-500">
          days
        </span>
      </div>
    </Field>
  );
}

function OptionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <div className="font-semibold">
          {label}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-5 w-5"
      />
    </label>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}