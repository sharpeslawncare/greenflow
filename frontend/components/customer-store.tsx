"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  demoCustomers,
  type Customer,
} from "@/lib/demo-customers";

import { recordAuditEvent } from "@/components/audit-store";

/*
 * programmeStartDate is blank for established
 * customers whose full programme should be retained.
 *
 * New and imported customers receive today's date
 * automatically. This allows the Programme Store to
 * exclude treatment rounds that have already passed.
 */
export type AdditionalCustomerJobStatus =
  | "Unscheduled"
  | "Scheduled"
  | "Completed"
  | "Cancelled";

export type AdditionalCustomerJob = {
  id: string;
  treatmentLibraryId: string;
  treatmentName: string;
  wordingSnapshot: string;
  scheduledDate: string;
  price: number;
  notes: string;
  status: AdditionalCustomerJobStatus;
  createdAt: string;
};

export type CustomerPaymentMethod =
  | "Standard"
  | "Direct Debit";

export type StoredCustomer = Customer & {
  programmeStartDate: string;
  additionalJobs: AdditionalCustomerJob[];
  gateCode: string;
  paymentMethod: CustomerPaymentMethod;
};

type CustomerInput =
  | Customer
  | StoredCustomer;

export type CustomerUpdateResult = {
  success: boolean;
  message: string;
};

type CustomerStoreValue = {
  customers: StoredCustomer[];
  ready: boolean;

  addCustomer: (
    customer: CustomerInput,
  ) => {
    success: boolean;
    message: string;
  };

  updateCustomer: (
    customer: CustomerInput,
  ) => CustomerUpdateResult;

  getCustomer: (
    customerNumber: string,
  ) => StoredCustomer | undefined;

  getNextCustomerNumber: () => string;

  restoreDemoCustomers: () => void;

  replaceCustomers: (
    customers: Customer[],
  ) => void;
};

const CustomerStoreContext =
  createContext<CustomerStoreValue | null>(
    null,
  );

const STORAGE_KEY =
  "greenflow-customers-v1";

export function CustomerStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const initialCustomers =
    normaliseEstablishedCustomers(
      demoCustomers,
    );

  const [customers, setCustomers] =
    useState<StoredCustomer[]>(
      initialCustomers,
    );

  const customersRef =
    useRef<StoredCustomer[]>(
      initialCustomers,
    );

  const [ready, setReady] =
    useState(false);

  const skipFirstPersistenceRef =
    useRef(true);

  useEffect(() => {
    const savedCustomers =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    let loadedCustomers =
      initialCustomers;

    if (savedCustomers) {
      try {
        const parsedCustomers =
          JSON.parse(
            savedCustomers,
          ) as Array<
            Partial<StoredCustomer>
          >;

        if (
          Array.isArray(
            parsedCustomers,
          )
        ) {
          /*
           * Records already carrying a programme
           * start date retain it.
           *
           * Older records with no such field are
           * treated as established customers, so
           * their complete group programme remains
           * available.
           */
          loadedCustomers =
            deduplicateCustomers(
              parsedCustomers.map(
                normaliseStoredCustomer,
              ),
            ).sort(
              sortCustomers,
            );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        loadedCustomers =
          normaliseEstablishedCustomers(
            demoCustomers,
          );
      }
    }

    /*
     * Keep the ref and React state in step before
     * marking the store as ready. Detail pages use
     * getCustomer(), which reads from this ref.
     */
    customersRef.current =
      loadedCustomers;

    setCustomers(
      loadedCustomers,
    );

    setReady(true);
  }, []);

  useEffect(() => {
    customersRef.current =
      customers;
  }, [customers]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    /*
     * The first ready render follows hydration from
     * localStorage. Do not immediately write that
     * render back to storage; subsequent genuine
     * customer changes are persisted normally.
     */
    if (skipFirstPersistenceRef.current) {
      skipFirstPersistenceRef.current =
        false;
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(customers),
    );
  }, [customers, ready]);

  function addCustomer(
    customer: CustomerInput,
  ) {
    const newCustomer =
      normaliseNewCustomer(
        customer,
      );

    if (
      !newCustomer.customerNumber
    ) {
      return {
        success: false,
        message:
          "Enter a customer number before adding the customer.",
      };
    }

    const currentCustomers =
      customersRef.current;

    const duplicate =
      currentCustomers.some(
        (existingCustomer) =>
          sameCustomerNumber(
            existingCustomer.customerNumber,
            newCustomer.customerNumber,
          ),
      );

    if (duplicate) {
      return {
        success: false,
        message:
          `Customer number ${newCustomer.customerNumber} already exists.`,
      };
    }

    const nextCustomers = [
      ...currentCustomers,
      newCustomer,
    ].sort(
      sortCustomers,
    );

    customersRef.current =
      nextCustomers;

    setCustomers(
      nextCustomers,
    );

    recordAuditEvent({
      area: "Customers",
      action: "Created",
      reference: newCustomer.customerNumber,
      description: `Customer ${newCustomer.customerNumber} created.`,
      changedFields: [],
    });

    return {
      success: true,
      message:
        "Customer added successfully. Remaining treatment dates will be assigned automatically from their group.",
    };
  }

  function updateCustomer(
    updatedCustomer: CustomerInput,
  ): CustomerUpdateResult {
    const currentCustomers =
      customersRef.current;

    const index =
      currentCustomers.findIndex(
        (customer) =>
          sameCustomerNumber(
            customer.customerNumber,
            updatedCustomer.customerNumber,
          ),
      );

    if (index < 0) {
      return {
        success: false,
        message:
          "The customer could not be found, so no changes were saved.",
      };
    }

    const existingCustomer =
      currentCustomers[index];

    const normalised =
      normaliseUpdatedCustomer(
        updatedCustomer,
        existingCustomer,
      );

    const changedFields =
      getChangedCustomerFields(
        existingCustomer,
        normalised,
      );

    const nextCustomers =
      currentCustomers.map(
        (customer, itemIndex) =>
          itemIndex === index
            ? normalised
            : customer,
      );

    customersRef.current =
      nextCustomers;

    setCustomers(
      nextCustomers,
    );

    if (changedFields.length > 0) {
      recordAuditEvent({
        area: "Customers",
        action: "Updated",
        reference: normalised.customerNumber,
        description: `Customer ${normalised.customerNumber} updated.`,
        changedFields,
      });
    }

    return {
      success: true,
      message:
        "Customer updated successfully.",
    };
  }

  function getCustomer(
    customerNumber: string,
  ) {
    /*
     * Customer lookups must use the current React state.
     *
     * On a hard refresh the localStorage hydration updates
     * `customers` before the detail page performs its final
     * lookup. Using the state here keeps getCustomer() on
     * the same source of truth as the customer list and
     * avoids a stale ref returning "Customer not found".
     */
    return customers.find(
      (customer) =>
        sameCustomerNumber(
          customer.customerNumber,
          customerNumber,
        ),
    );
  }

  function getNextCustomerNumber() {
    const highestNumber =
      customersRef.current.reduce(
        (highest, customer) => {
          const customerNumber =
            Number(
              customer.customerNumber,
            );

          return Number.isFinite(
            customerNumber,
          )
            ? Math.max(
                highest,
                customerNumber,
              )
            : highest;
        },
        1000,
      );

    return String(
      highestNumber + 1,
    );
  }

  function restoreDemoCustomers() {
    /*
     * Demonstration customers are established
     * customers, so their programme start date is
     * deliberately blank. They receive all five
     * dates assigned to their group.
     */
    const demo =
      normaliseEstablishedCustomers(
        demoCustomers,
      );

    customersRef.current =
      demo;

    setCustomers(
      demo,
    );

    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    recordAuditEvent({
      area: "Customers",
      action: "Restored",
      reference: "demo-customers",
      description: `Customer data restored to ${demo.length} demonstration records.`,
      changedFields: [],
    });
  }

  function replaceCustomers(
    replacementCustomers: Customer[],
  ) {
    const normalisedCustomers =
      deduplicateCustomers(
        normaliseEstablishedCustomers(
          replacementCustomers,
        ),
      ).sort(
        sortCustomers,
      );

    customersRef.current =
      normalisedCustomers;

    setCustomers(
      normalisedCustomers,
    );

    recordAuditEvent({
      area: "Customers",
      action: "Replaced",
      reference: "customer-dataset",
      description: `Customer dataset replaced with ${normalisedCustomers.length} records.`,
      changedFields: [],
    });
  }

  const value =
    useMemo<CustomerStoreValue>(
      () => ({
        customers,
        ready,

        addCustomer,
        updateCustomer,

        getCustomer,
        getNextCustomerNumber,

        restoreDemoCustomers,
        replaceCustomers,
      }),
      [customers, ready],
    );

  return (
    <CustomerStoreContext.Provider
      value={value}
    >
      {children}
    </CustomerStoreContext.Provider>
  );
}

export function useCustomerStore() {
  const context =
    useContext(
      CustomerStoreContext,
    );

  if (!context) {
    throw new Error(
      "useCustomerStore must be used inside CustomerStoreProvider.",
    );
  }

  return context;
}

function normaliseEstablishedCustomers(
  customers: Customer[],
): StoredCustomer[] {
  return deduplicateCustomers(
    customers.map((customer) =>
      normaliseStoredCustomer({
        ...customer,

        /*
         * Blank means this is an established customer
         * and all five group dates may be retained.
         */
        programmeStartDate: "",
      }),
    ),
  ).sort(sortCustomers);
}

function normaliseStoredCustomer(
  customer:
    Partial<StoredCustomer>,
): StoredCustomer {
  return {
    customerNumber:
      normaliseCustomerNumber(
        customer.customerNumber,
      ),

    firstName:
      customer.firstName?.trim() ?? "",

    surname:
      customer.surname?.trim() ?? "",

    fullName:
      customer.fullName?.trim() ||
      [
        customer.firstName?.trim(),
        customer.surname?.trim(),
      ]
        .filter(Boolean)
        .join(" "),

    address:
      customer.address?.trim() ?? "",

    postcode:
      customer.postcode
        ?.trim()
        .toUpperCase() ?? "",

    email:
      customer.email?.trim() ?? "",

    homePhone:
      customer.homePhone?.trim() ?? "",

    mobilePhone:
      customer.mobilePhone?.trim() ?? "",

    lawnSize:
      safeNumber(
        customer.lawnSize,
      ),

    groupNumber:
      safePositiveInteger(
        customer.groupNumber,
        1,
      ),

    treatmentPrice:
      safeNumber(
        customer.treatmentPrice,
      ),

    status:
      normaliseCustomerStatus(
        customer.status,
      ),

    vanNumber:
      safePositiveInteger(
        customer.vanNumber,
        1,
      ),

    nextVisit:
      customer.nextVisit ??
      "Not yet scheduled",

    lastVisit:
      customer.lastVisit ??
      "Not yet visited",

    lockedGate:
      customer.lockedGate ??
      false,

    gateCode:
      customer.gateCode?.trim() ?? "",

    paymentMethod:
      normaliseCustomerPaymentMethod(
        customer.paymentMethod,
      ),

    dogOnProperty:
      customer.dogOnProperty ??
      false,

    preferredContact:
      normalisePreferredContact(
        customer.preferredContact,
      ),

    notes:
      customer.notes?.trim() ?? "",

    additionalJobs:
      normaliseAdditionalJobs(
        customer.additionalJobs,
      ),

    /*
     * Missing values belong to records created
     * before this scheduling rule was introduced.
     * They are treated as established customers.
     */
    programmeStartDate:
      isDateValue(
        customer.programmeStartDate ??
          "",
      )
        ? customer.programmeStartDate!
        : "",
  };
}

function normaliseNewCustomer(
  customer: CustomerInput,
): StoredCustomer {
  const normalised =
    normaliseStoredCustomer(
      customer,
    );

  return {
    ...normalised,

    programmeStartDate:
      isDateValue(
        "programmeStartDate" in
          customer
          ? customer.programmeStartDate
          : "",
      )
        ? (
            customer as StoredCustomer
          ).programmeStartDate
        : toDateValue(
            new Date(),
          ),
  };
}

function normaliseUpdatedCustomer(
  updatedCustomer: CustomerInput,
  existingCustomer: StoredCustomer,
): StoredCustomer {
  const normalised =
    normaliseStoredCustomer({
      ...existingCustomer,
      ...updatedCustomer,
    });

  const suppliedStartDate =
    "programmeStartDate" in
    updatedCustomer
      ? updatedCustomer.programmeStartDate
      : undefined;

  return {
    ...normalised,

    programmeStartDate:
      isDateValue(
        suppliedStartDate ?? "",
      )
        ? suppliedStartDate!
        : existingCustomer.programmeStartDate,
  };
}

function normaliseAdditionalJobs(
  value: unknown,
): AdditionalCustomerJob[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is Partial<AdditionalCustomerJob> =>
        Boolean(
          item &&
            typeof item === "object",
        ),
    )
    .map((job) => ({
      id:
        typeof job.id === "string" &&
        job.id.trim()
          ? job.id
          : `additional-job-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

      treatmentLibraryId:
        typeof job.treatmentLibraryId ===
        "string"
          ? job.treatmentLibraryId
          : "",

      treatmentName:
        typeof job.treatmentName ===
        "string"
          ? job.treatmentName.trim()
          : "Additional treatment",

      wordingSnapshot:
        typeof job.wordingSnapshot ===
        "string"
          ? job.wordingSnapshot
          : "",

      scheduledDate:
        isDateValue(
          typeof job.scheduledDate ===
            "string"
            ? job.scheduledDate
            : "",
        )
          ? job.scheduledDate!
          : "",

      price:
        safeNumber(job.price),

      notes:
        typeof job.notes === "string"
          ? job.notes.trim()
          : "",

      status:
        (
          job.status === "Completed" ||
          job.status === "Cancelled"
            ? job.status
            : isDateValue(
                typeof job.scheduledDate ===
                  "string"
                  ? job.scheduledDate
                  : "",
              )
              ? "Scheduled"
              : "Unscheduled"
        ) as AdditionalCustomerJobStatus,

      createdAt:
        typeof job.createdAt ===
          "string" &&
        job.createdAt.trim()
          ? job.createdAt
          : new Date().toISOString(),
    }))
    .sort(
      (first, second) =>
        first.scheduledDate.localeCompare(
          second.scheduledDate,
        ),
    );
}

function normaliseCustomerStatus(
  value: string | undefined,
): Customer["status"] {
  if (
    value === "Active" ||
    value === "Paused" ||
    value === "Inactive"
  ) {
    return value;
  }

  return "Active";
}

function normaliseCustomerPaymentMethod(
  value: unknown,
): CustomerPaymentMethod {
  return value === "Direct Debit"
    ? "Direct Debit"
    : "Standard";
}

function normalisePreferredContact(
  value: string | undefined,
): Customer["preferredContact"] {
  if (
    value === "SMS" ||
    value === "Email" ||
    value === "Telephone"
  ) {
    return value;
  }

  return "SMS";
}

function normaliseCustomerNumber(
  value: string | undefined,
) {
  return value?.trim() ?? "";
}

function sameCustomerNumber(
  first: string,
  second: string,
) {
  const firstNumber =
    normaliseCustomerNumber(
      first,
    );

  const secondNumber =
    normaliseCustomerNumber(
      second,
    );

  return (
    Boolean(firstNumber) &&
    firstNumber === secondNumber
  );
}

function customerPriority(
  customer: StoredCustomer,
) {
  return (
    Number(
      Boolean(customer.fullName),
    ) *
      100 +
    Number(
      Boolean(customer.address),
    ) *
      50 +
    Number(
      Boolean(customer.postcode),
    ) *
      25 +
    Number(
      Boolean(
        customer.email ||
        customer.mobilePhone ||
        customer.homePhone,
      ),
    ) *
      20 +
    Number(
      customer.lawnSize > 0,
    ) *
      10 +
    Number(
      customer.treatmentPrice > 0,
    ) *
      10 +
    Number(
      Boolean(
        customer.programmeStartDate,
      ),
    ) *
      5 +
    Number(
      Boolean(customer.notes),
    )
  );
}

function mergeDuplicateCustomers(
  preferred: StoredCustomer,
  secondary: StoredCustomer,
): StoredCustomer {
  return normaliseStoredCustomer({
    ...secondary,
    ...preferred,
    customerNumber:
      preferred.customerNumber ||
      secondary.customerNumber,
    firstName:
      preferred.firstName ||
      secondary.firstName,
    surname:
      preferred.surname ||
      secondary.surname,
    fullName:
      preferred.fullName ||
      secondary.fullName,
    address:
      preferred.address ||
      secondary.address,
    postcode:
      preferred.postcode ||
      secondary.postcode,
    email:
      preferred.email ||
      secondary.email,
    homePhone:
      preferred.homePhone ||
      secondary.homePhone,
    mobilePhone:
      preferred.mobilePhone ||
      secondary.mobilePhone,
    lawnSize:
      preferred.lawnSize > 0
        ? preferred.lawnSize
        : secondary.lawnSize,
    treatmentPrice:
      preferred.treatmentPrice > 0
        ? preferred.treatmentPrice
        : secondary.treatmentPrice,
    nextVisit:
      preferred.nextVisit !==
      "Not yet scheduled"
        ? preferred.nextVisit
        : secondary.nextVisit,
    lastVisit:
      preferred.lastVisit !==
      "Not yet visited"
        ? preferred.lastVisit
        : secondary.lastVisit,
    notes:
      preferred.notes ||
      secondary.notes,
    gateCode:
      preferred.gateCode ||
      secondary.gateCode,
    programmeStartDate:
      preferred.programmeStartDate ||
      secondary.programmeStartDate,
  });
}

function deduplicateCustomers(
  customers: StoredCustomer[],
) {
  const byCustomerNumber =
    new Map<
      string,
      StoredCustomer
    >();

  const withoutNumber:
    StoredCustomer[] = [];

  for (
    const customer of customers
  ) {
    const customerNumber =
      normaliseCustomerNumber(
        customer.customerNumber,
      );

    if (!customerNumber) {
      withoutNumber.push(
        customer,
      );
      continue;
    }

    const normalised = {
      ...customer,
      customerNumber,
    };

    const existing =
      byCustomerNumber.get(
        customerNumber,
      );

    if (!existing) {
      byCustomerNumber.set(
        customerNumber,
        normalised,
      );
      continue;
    }

    const preferred =
      customerPriority(
        normalised,
      ) >
      customerPriority(
        existing,
      )
        ? normalised
        : existing;

    const secondary =
      preferred === normalised
        ? existing
        : normalised;

    byCustomerNumber.set(
      customerNumber,
      mergeDuplicateCustomers(
        preferred,
        secondary,
      ),
    );
  }

  /*
   * Blank customer numbers are not considered valid
   * identities. Keep at most one legacy blank record
   * rather than allowing multiple ambiguous records
   * to survive normalisation.
   */
  const bestBlank =
    withoutNumber
      .sort(
        (first, second) =>
          customerPriority(second) -
          customerPriority(first),
      )[0];

  return [
    ...byCustomerNumber.values(),
    ...(bestBlank
      ? [bestBlank]
      : []),
  ];
}

const AUDITABLE_CUSTOMER_FIELDS: Array<
  keyof StoredCustomer
> = [
  "firstName",
  "surname",
  "fullName",
  "address",
  "postcode",
  "email",
  "homePhone",
  "mobilePhone",
  "lawnSize",
  "groupNumber",
  "treatmentPrice",
  "status",
  "vanNumber",
  "nextVisit",
  "lastVisit",
  "lockedGate",
  "paymentMethod",
  "dogOnProperty",
  "preferredContact",
  "notes",
  "additionalJobs",
  "programmeStartDate",
];

/*
 * gateCode is deliberately excluded from the audit
 * field list. The audit trail records that a customer
 * changed, but never stores or highlights gate-code
 * information.
 */
function getChangedCustomerFields(
  previous: StoredCustomer,
  next: StoredCustomer,
) {
  return AUDITABLE_CUSTOMER_FIELDS.filter(
    (field) =>
      JSON.stringify(previous[field]) !==
      JSON.stringify(next[field]),
  );
}

function sortCustomers(
  firstCustomer: StoredCustomer,
  secondCustomer: StoredCustomer,
) {
  const firstNumber =
    Number(
      firstCustomer.customerNumber,
    );

  const secondNumber =
    Number(
      secondCustomer.customerNumber,
    );

  if (
    Number.isFinite(firstNumber) &&
    Number.isFinite(secondNumber)
  ) {
    return (
      firstNumber -
      secondNumber
    );
  }

  return firstCustomer.customerNumber.localeCompare(
    secondCustomer.customerNumber,
  );
}

function safeNumber(
  value: number | undefined,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    value,
  );
}

function safePositiveInteger(
  value: number | undefined,
  fallback: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value),
  );
}

function isDateValue(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseDateValue(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateValue(date) === value
  );
}

function parseDateValue(
  value: string,
) {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function toDateValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}