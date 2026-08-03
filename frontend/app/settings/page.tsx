"use client";

import Link from "next/link";
import {
  type ReactNode,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type AdvisoryType,
  type BrandingSettings,
  type BusinessSettings,
  type InvoiceSettings,
  type TreatmentWordingSettings,
  useSettingsStore,
} from "@/components/settings-store";

type SettingsTab =
  | "business"
  | "invoices"
  | "wording"
  | "advisories"
  | "branding";

const tabs: Array<{
  id: SettingsTab;
  label: string;
}> = [
  {
    id: "business",
    label: "Business details",
  },
  {
    id: "invoices",
    label: "Invoices",
  },
  {
    id: "wording",
    label: "Treatment wording",
  },
  {
    id: "advisories",
    label: "Advisories",
  },
  {
    id: "branding",
    label: "Branding",
  },
];

export default function SettingsPage() {
  const {
    settings,
    ready,
    updateBusinessSettings,
    updateInvoiceSettings,
    updateTreatmentWording,
    updateBrandingSettings,
    updateAdvisory,
    addAdvisory,
    deleteAdvisory,
    getNextInvoiceNumber,
    incrementInvoiceNumber,
    restoreDefaultSettings,
  } = useSettingsStore();

  const [activeTab, setActiveTab] =
    useState<SettingsTab>("business");

  const [message, setMessage] =
    useState("");

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2800);
  }

  function restoreDefaults() {
    const confirmed = window.confirm(
      "Restore all GreenFlow business settings to their original demonstration values?",
    );

    if (!confirmed) return;

    restoreDefaultSettings();
    showMessage(
      "Default GreenFlow settings restored.",
    );
  }

  function testInvoiceNumber() {
    const confirmed = window.confirm(
      `The next invoice number is ${getNextInvoiceNumber()}. Increase it to the following number?`,
    );

    if (!confirmed) return;

    incrementInvoiceNumber();

    showMessage(
      "The next invoice number was increased.",
    );
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading business settings...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Business Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage Sharpes Lawn Care details,
                invoice wording, customer advice and
                GreenFlow branding.
              </p>
            </div>

            <button
              type="button"
              onClick={restoreDefaults}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Restore default settings
            </button>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <nav className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-[#176b37] text-[#176b37]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="p-5 md:p-6">
              {activeTab === "business" && (
                <BusinessTab
                  settings={settings.business}
                  updateSettings={
                    updateBusinessSettings
                  }
                />
              )}

              {activeTab === "invoices" && (
                <InvoicesTab
                  settings={settings.invoices}
                  nextInvoiceNumber={getNextInvoiceNumber()}
                  updateSettings={
                    updateInvoiceSettings
                  }
                  onIncreaseInvoiceNumber={
                    testInvoiceNumber
                  }
                />
              )}

              {activeTab === "wording" && (
                <TreatmentWordingTab
                  settings={
                    settings.treatmentWording
                  }
                  updateSettings={
                    updateTreatmentWording
                  }
                />
              )}

              {activeTab === "advisories" && (
                <AdvisoriesTab
                  advisories={
                    settings.advisories
                  }
                  updateAdvisory={
                    updateAdvisory
                  }
                  addAdvisory={addAdvisory}
                  deleteAdvisory={
                    deleteAdvisory
                  }
                />
              )}

              {activeTab === "branding" && (
                <BrandingTab
                  settings={settings.branding}
                  businessName={
                    settings.business
                      .businessName
                  }
                  applicationName={
                    settings.business
                      .applicationName
                  }
                  updateSettings={
                    updateBrandingSettings
                  }
                />
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm">
              <span className="text-slate-500">
                Changes are saved automatically in
                this browser.
              </span>

              <span className="font-semibold text-green-700">
                Settings active
              </span>
            </footer>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function BusinessTab({
  settings,
  updateSettings,
}: {
  settings: BusinessSettings;
  updateSettings: (
    updates: Partial<BusinessSettings>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Business details"
        description="These details will later appear throughout GreenFlow, including customer documents and invoices."
      />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Application name">
          <input
            value={settings.applicationName}
            onChange={(event) =>
              updateSettings({
                applicationName:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Business or trading name">
          <input
            value={settings.businessName}
            onChange={(event) =>
              updateSettings({
                businessName:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Proprietor name">
          <input
            value={settings.proprietorName}
            onChange={(event) =>
              updateSettings({
                proprietorName:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Telephone">
          <input
            value={settings.telephone}
            onChange={(event) =>
              updateSettings({
                telephone:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Mobile">
          <input
            value={settings.mobile}
            onChange={(event) =>
              updateSettings({
                mobile: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Email address">
          <input
            type="email"
            value={settings.email}
            onChange={(event) =>
              updateSettings({
                email: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Website">
          <input
            value={settings.website}
            onChange={(event) =>
              updateSettings({
                website:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="VAT number">
          <input
            value={settings.vatNumber}
            onChange={(event) =>
              updateSettings({
                vatNumber:
                  event.target.value,
              })
            }
            placeholder="For example, GB 123 4567 89"
            className={inputClass}
          />
        </Field>

        <Field label="Address line 1">
          <input
            value={settings.addressLine1}
            onChange={(event) =>
              updateSettings({
                addressLine1:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Address line 2">
          <input
            value={settings.addressLine2}
            onChange={(event) =>
              updateSettings({
                addressLine2:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Town or city">
          <input
            value={settings.town}
            onChange={(event) =>
              updateSettings({
                town: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="County">
          <input
            value={settings.county}
            onChange={(event) =>
              updateSettings({
                county: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Postcode">
          <input
            value={settings.postcode}
            onChange={(event) =>
              updateSettings({
                postcode:
                  event.target.value.toUpperCase(),
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Company number">
          <input
            value={settings.companyNumber}
            onChange={(event) =>
              updateSettings({
                companyNumber:
                  event.target.value,
              })
            }
            placeholder="Leave blank if not applicable"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Enter only the business details you want
        displayed on customer-facing paperwork.
      </div>
    </div>
  );
}

function InvoicesTab({
  settings,
  nextInvoiceNumber,
  updateSettings,
  onIncreaseInvoiceNumber,
}: {
  settings: InvoiceSettings;
  nextInvoiceNumber: string;
  updateSettings: (
    updates: Partial<InvoiceSettings>,
  ) => void;
  onIncreaseInvoiceNumber: () => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Invoice settings"
        description="Control invoice numbering, payment instructions and the customer-facing footer."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Invoice prefix">
            <input
              value={settings.invoicePrefix}
              onChange={(event) =>
                updateSettings({
                  invoicePrefix:
                    event.target.value.toUpperCase(),
                })
              }
              placeholder="INV"
              className={inputClass}
            />
          </Field>

          <Field label="Next invoice number">
            <input
              type="number"
              min="1"
              value={
                settings.nextInvoiceNumber
              }
              onChange={(event) =>
                updateSettings({
                  nextInvoiceNumber:
                    Number(
                      event.target.value,
                    ) || 1,
                })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Number padding">
            <select
              value={
                settings.invoiceNumberPadding
              }
              onChange={(event) =>
                updateSettings({
                  invoiceNumberPadding:
                    Number(
                      event.target.value,
                    ),
                })
              }
              className={inputClass}
            >
              <option value={3}>
                3 digits — 001
              </option>

              <option value={4}>
                4 digits — 0001
              </option>

              <option value={5}>
                5 digits — 00001
              </option>

              <option value={6}>
                6 digits — 000001
              </option>
            </select>
          </Field>

          <Field label="VAT display">
            <select
              value={
                settings.showAmountIncludingVat
                  ? "including"
                  : "excluding"
              }
              onChange={(event) =>
                updateSettings({
                  showAmountIncludingVat:
                    event.target.value ===
                    "including",
                })
              }
              className={inputClass}
            >
              <option value="including">
                Show amount including VAT
              </option>

              <option value="excluding">
                Do not add including-VAT wording
              </option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Payment instructions">
              <textarea
                rows={4}
                value={
                  settings.paymentInstructions
                }
                onChange={(event) =>
                  updateSettings({
                    paymentInstructions:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="VAT wording">
              <textarea
                rows={3}
                value={settings.vatWording}
                onChange={(event) =>
                  updateSettings({
                    vatWording:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Invoice footer message">
              <textarea
                rows={4}
                value={
                  settings.footerMessage
                }
                onChange={(event) =>
                  updateSettings({
                    footerMessage:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Email copy message">
              <textarea
                rows={4}
                value={
                  settings.emailCopyMessage
                }
                onChange={(event) =>
                  updateSettings({
                    emailCopyMessage:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="text-sm font-bold uppercase tracking-wide text-green-800">
              Next invoice number
            </div>

            <div className="mt-3 break-all text-3xl font-bold text-green-950">
              {nextInvoiceNumber}
            </div>

            <p className="mt-3 text-sm leading-6 text-green-800">
              This is a preview only. GreenFlow is
              not yet reserving or permanently
              assigning invoice numbers to individual
              documents.
            </p>

            <button
              type="button"
              onClick={onIncreaseInvoiceNumber}
              className="mt-4 w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
            >
              Test next number
            </button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Sequential invoice numbering needs to be
            finalised when GreenFlow is connected to
            its permanent database. Until then,
            QuickBooks remains the official invoice
            and VAT record.
          </div>
        </aside>
      </div>
    </div>
  );
}

function TreatmentWordingTab({
  settings,
  updateSettings,
}: {
  settings: TreatmentWordingSettings;
  updateSettings: (
    updates: Partial<TreatmentWordingSettings>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Treatment wording"
        description="These messages can be used on customer treatment reports without displaying your internal product records."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <TextSetting
          label="Seasonal fertiliser visit"
          value={
            settings.seasonalFertiliserVisit
          }
          onChange={(value) =>
            updateSettings({
              seasonalFertiliserVisit:
                value,
            })
          }
        />

        <TextSetting
          label="Selective herbicide visit"
          value={settings.herbicideVisit}
          onChange={(value) =>
            updateSettings({
              herbicideVisit: value,
            })
          }
        />

        <TextSetting
          label="Combined fertiliser and herbicide"
          value={
            settings.combinedFertiliserAndHerbicideVisit
          }
          onChange={(value) =>
            updateSettings({
              combinedFertiliserAndHerbicideVisit:
                value,
            })
          }
        />

        <TextSetting
          label="Moss-control visit"
          value={
            settings.mossControlVisit
          }
          onChange={(value) =>
            updateSettings({
              mossControlVisit: value,
            })
          }
        />

        <TextSetting
          label="Aeration"
          value={settings.aerationVisit}
          onChange={(value) =>
            updateSettings({
              aerationVisit: value,
            })
          }
        />

        <TextSetting
          label="Scarification"
          value={
            settings.scarificationVisit
          }
          onChange={(value) =>
            updateSettings({
              scarificationVisit: value,
            })
          }
        />

        <TextSetting
          label="Overseeding"
          value={
            settings.overseedingVisit
          }
          onChange={(value) =>
            updateSettings({
              overseedingVisit: value,
            })
          }
        />

        <TextSetting
          label="Cancelled visit"
          value={
            settings.cancelledVisit
          }
          onChange={(value) =>
            updateSettings({
              cancelledVisit: value,
            })
          }
        />

        <TextSetting
          label="Rescheduled visit"
          value={
            settings.rescheduledVisit
          }
          onChange={(value) =>
            updateSettings({
              rescheduledVisit: value,
            })
          }
        />

        <TextSetting
          label="Preparing for the next visit"
          value={
            settings.nextVisitPreparation
          }
          onChange={(value) =>
            updateSettings({
              nextVisitPreparation:
                value,
            })
          }
          large
        />
      </div>
    </div>
  );
}

function AdvisoriesTab({
  advisories,
  updateAdvisory,
  addAdvisory,
  deleteAdvisory,
}: {
  advisories: Array<{
    id: string;
    title: string;
    wording: string;
    type: AdvisoryType;
    active: boolean;
  }>;
  updateAdvisory: (
    advisoryId: string,
    updates: {
      title?: string;
      wording?: string;
      type?: AdvisoryType;
      active?: boolean;
    },
  ) => void;
  addAdvisory: () => void;
  deleteAdvisory: (
    advisoryId: string,
  ) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Customer advisories"
          description="Control the prominent warning and advice boxes shown on treatment paperwork."
        />

        <button
          type="button"
          onClick={addAdvisory}
          className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
        >
          + Add advisory
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {advisories.map((advisory) => (
          <article
            key={advisory.id}
            className={`rounded-2xl border p-5 ${
              advisory.type === "danger"
                ? "border-red-200 bg-red-50/40"
                : advisory.type ===
                    "warning"
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-blue-200 bg-blue-50/40"
            }`}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_190px_150px]">
              <div className="space-y-4">
                <Field label="Heading">
                  <input
                    value={advisory.title}
                    onChange={(event) =>
                      updateAdvisory(
                        advisory.id,
                        {
                          title:
                            event.target.value,
                        },
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Customer-facing wording">
                  <textarea
                    rows={4}
                    value={
                      advisory.wording
                    }
                    onChange={(event) =>
                      updateAdvisory(
                        advisory.id,
                        {
                          wording:
                            event.target.value,
                        },
                      )
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Advisory type">
                <select
                  value={advisory.type}
                  onChange={(event) =>
                    updateAdvisory(
                      advisory.id,
                      {
                        type: event.target
                          .value as AdvisoryType,
                      },
                    )
                  }
                  className={inputClass}
                >
                  <option value="danger">
                    Red warning
                  </option>

                  <option value="warning">
                    Amber caution
                  </option>

                  <option value="information">
                    Blue information
                  </option>
                </select>
              </Field>

              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-sm font-semibold">
                    Active
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      advisory.active
                    }
                    onChange={(event) =>
                      updateAdvisory(
                        advisory.id,
                        {
                          active:
                            event.target
                              .checked,
                        },
                      )
                    }
                    className="h-5 w-5"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const confirmed =
                      window.confirm(
                        `Delete "${advisory.title}"?`,
                      );

                    if (confirmed) {
                      deleteAdvisory(
                        advisory.id,
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Delete advisory
                </button>
              </div>
            </div>

            <AdvisoryPreview
              title={advisory.title}
              wording={advisory.wording}
              type={advisory.type}
              active={advisory.active}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function BrandingTab({
  settings,
  businessName,
  applicationName,
  updateSettings,
}: {
  settings: BrandingSettings;
  businessName: string;
  applicationName: string;
  updateSettings: (
    updates: Partial<BrandingSettings>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Branding and appearance"
        description="Store GreenFlow’s identity in one place so the application can later be rebranded for other companies."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_480px]">
        <div className="grid gap-5 md:grid-cols-2">
          <ColourField
            label="Primary dark green"
            value={settings.primaryColour}
            onChange={(value) =>
              updateSettings({
                primaryColour: value,
              })
            }
          />

          <ColourField
            label="Secondary green"
            value={
              settings.secondaryColour
            }
            onChange={(value) =>
              updateSettings({
                secondaryColour: value,
              })
            }
          />

          <ColourField
            label="Warning colour"
            value={settings.warningColour}
            onChange={(value) =>
              updateSettings({
                warningColour: value,
              })
            }
          />

          <Field label="Application subtitle">
            <input
              value={
                settings.applicationSubtitle
              }
              onChange={(event) =>
                updateSettings({
                  applicationSubtitle:
                    event.target.value,
                })
              }
              className={inputClass}
            />
          </Field>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4 md:col-span-2">
            <div>
              <div className="font-semibold">
                Show business name in the sidebar
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Useful now for Sharpes Lawn Care and
                later for other GreenFlow companies.
              </div>
            </div>

            <input
              type="checkbox"
              checked={
                settings.showBusinessNameInSidebar
              }
              onChange={(event) =>
                updateSettings({
                  showBusinessNameInSidebar:
                    event.target.checked,
                })
              }
              className="h-5 w-5"
            />
          </label>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Branding preview
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className="p-5 text-white"
              style={{
                backgroundColor:
                  settings.primaryColour,
              }}
            >
              <div className="text-2xl font-bold">
                {applicationName}
              </div>

              <div className="mt-1 text-sm opacity-80">
                {settings.applicationSubtitle}
              </div>

              {settings.showBusinessNameInSidebar && (
                <div className="mt-5 rounded-xl bg-white/10 p-3 text-sm font-semibold">
                  {businessName}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="text-xl font-bold">
                Operations Dashboard
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Example of how the selected colours
                and identity could appear throughout
                the application.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  style={{
                    backgroundColor:
                      settings.primaryColour,
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  Primary action
                </button>

                <button
                  type="button"
                  style={{
                    borderColor:
                      settings.secondaryColour,
                    color:
                      settings.secondaryColour,
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Secondary action
                </button>

                <span
                  style={{
                    backgroundColor:
                      `${settings.warningColour}18`,
                    color:
                      settings.warningColour,
                  }}
                  className="rounded-full px-3 py-2 text-sm font-bold"
                >
                  Warning
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            The colour values are saved now. We will
            connect them to the full application
            shell in a later step.
          </p>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
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

function TextSetting({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
}) {
  return (
    <div
      className={
        large ? "lg:col-span-2" : ""
      }
    >
      <Field label={label}>
        <textarea
          rows={large ? 5 : 4}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={inputClass}
        />
      </Field>

      <div className="mt-1 text-right text-xs text-slate-400">
        {value.length} characters
      </div>
    </div>
  );
}

function AdvisoryPreview({
  title,
  wording,
  type,
  active,
}: {
  title: string;
  wording: string;
  type: AdvisoryType;
  active: boolean;
}) {
  const styles =
    type === "danger"
      ? "border-red-400 bg-red-50 text-red-950"
      : type === "warning"
        ? "border-amber-400 bg-amber-50 text-amber-950"
        : "border-blue-400 bg-blue-50 text-blue-950";

  return (
    <div className="mt-5">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        Paperwork preview
      </div>

      <div
        className={`rounded-xl border-2 p-4 text-center ${styles} ${
          active ? "" : "opacity-40"
        }`}
      >
        <div className="text-sm font-extrabold uppercase tracking-wide">
          {title || "Advisory heading"}
        </div>

        <p className="mt-2 text-xs font-medium leading-5">
          {wording ||
            "Customer advisory wording"}
        </p>
      </div>
    </div>
  );
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-[46px] w-16 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
        />

        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={inputClass}
        />
      </div>
    </Field>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";