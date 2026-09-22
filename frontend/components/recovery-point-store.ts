export type RecoveryPointKind =
  | "automatic"
  | "manual"
  | "pre-restore";

export type RecoveryPoint = {
  id: string;
  createdAt: string;
  kind: RecoveryPointKind;
  label: string;
  itemCount: number;
  byteSize: number;
  fingerprint: string;
  items: Record<string, string>;
};

export type RecoveryAuditEvent = {
  id: string;
  createdAt: string;
  action:
    | "recovery-point-created"
    | "recovery-point-restored"
    | "recovery-point-deleted";
  recoveryPointId: string;
  label: string;
  kind: RecoveryPointKind;
};

const DATABASE_NAME = "greenflow-recovery-v1";
const DATABASE_VERSION = 1;
const RECOVERY_POINT_STORE = "recovery-points";
const AUDIT_STORAGE_KEY = "greenflow-recovery-audit-v1";
const LAST_AUTOMATIC_STORAGE_KEY =
  "greenflow-last-automatic-recovery-at";
const MAX_RECOVERY_POINTS = 6;
const AUTOMATIC_INTERVAL_MS =
  6 * 60 * 60 * 1000;
const MAX_AUDIT_EVENTS = 100;

export async function listRecoveryPoints() {
  const database = await openRecoveryDatabase();

  const points = await new Promise<RecoveryPoint[]>(
    (resolve, reject) => {
      const transaction = database.transaction(
        RECOVERY_POINT_STORE,
        "readonly",
      );

      const request = transaction
        .objectStore(RECOVERY_POINT_STORE)
        .getAll();

      request.onsuccess = () => {
        resolve(
          Array.isArray(request.result)
            ? request.result
            : [],
        );
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "Could not read GreenFlow recovery points.",
            ),
        );
      };
    },
  );

  database.close();

  return points.sort(
    (first, second) =>
      second.createdAt.localeCompare(
        first.createdAt,
      ),
  );
}

export async function createRecoveryPoint(
  label: string,
  kind: RecoveryPointKind = "manual",
) {
  const items = collectGreenFlowItems();
  const createdAt = new Date().toISOString();
  const fingerprint =
    createSnapshotFingerprint(items);

  const point: RecoveryPoint = {
    id: createRecoveryPointId(),
    createdAt,
    kind,
    label: label.trim() || defaultLabel(kind),
    itemCount: Object.keys(items).length,
    byteSize: calculateSnapshotSize(items),
    fingerprint,
    items,
  };

  const database = await openRecoveryDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      RECOVERY_POINT_STORE,
      "readwrite",
    );

    transaction
      .objectStore(RECOVERY_POINT_STORE)
      .put(point);

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error(
            "Could not save the GreenFlow recovery point.",
          ),
      );

    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error(
            "Saving the GreenFlow recovery point was aborted.",
          ),
      );
  });

  database.close();

  if (kind === "automatic") {
    window.localStorage.setItem(
      LAST_AUTOMATIC_STORAGE_KEY,
      createdAt,
    );
  }

  appendAuditEvent({
    action: "recovery-point-created",
    point,
  });

  await trimRecoveryPoints();

  return point;
}

let automaticRecoveryPromise:
  Promise<RecoveryPoint | null> | null = null;

export function createAutomaticRecoveryPointIfDue() {
  if (automaticRecoveryPromise) {
    return automaticRecoveryPromise;
  }

  automaticRecoveryPromise =
    createAutomaticRecoveryPointIfDueInternal().finally(
      () => {
        automaticRecoveryPromise = null;
      },
    );

  return automaticRecoveryPromise;
}

async function createAutomaticRecoveryPointIfDueInternal() {
  const lastAutomatic =
    window.localStorage.getItem(
      LAST_AUTOMATIC_STORAGE_KEY,
    );

  if (lastAutomatic) {
    const elapsed =
      Date.now() -
      new Date(lastAutomatic).getTime();

    if (
      Number.isFinite(elapsed) &&
      elapsed >= 0 &&
      elapsed < AUTOMATIC_INTERVAL_MS
    ) {
      return null;
    }
  }

  const currentItems = collectGreenFlowItems();
  const currentFingerprint =
    createSnapshotFingerprint(currentItems);
  const existing = await listRecoveryPoints();

  const matchingAutomaticPoint =
    existing.find(
      (point) =>
        point.kind === "automatic" &&
        point.fingerprint ===
          currentFingerprint,
    );

  if (matchingAutomaticPoint) {
    window.localStorage.setItem(
      LAST_AUTOMATIC_STORAGE_KEY,
      new Date().toISOString(),
    );

    return null;
  }

  /*
   * Re-check after the asynchronous IndexedDB read.
   * This protects against another browser tab having
   * created an automatic recovery point meanwhile.
   */
  const latestAutomatic =
    window.localStorage.getItem(
      LAST_AUTOMATIC_STORAGE_KEY,
    );

  if (latestAutomatic) {
    const elapsed =
      Date.now() -
      new Date(latestAutomatic).getTime();

    if (
      Number.isFinite(elapsed) &&
      elapsed >= 0 &&
      elapsed < AUTOMATIC_INTERVAL_MS
    ) {
      return null;
    }
  }

  return createRecoveryPoint(
    "Automatic safety recovery point",
    "automatic",
  );
}

export async function restoreRecoveryPoint(
  recoveryPointId: string,
) {
  const point =
    await getRecoveryPoint(
      recoveryPointId,
    );

  if (!point) {
    throw new Error(
      "That recovery point could not be found.",
    );
  }

  /*
   * Create a safety copy of the current state before
   * replacing anything. This means a restore itself can
   * be undone from the Recovery Points list.
   */
  await createRecoveryPoint(
    `Before restoring ${formatRecoveryPointDate(
      point.createdAt,
    )}`,
    "pre-restore",
  );

  const currentSettingsJson =
    window.localStorage.getItem(
      "greenflow-business-settings-v1",
    );

  const currentCustomerSequence =
    window.localStorage.getItem(
      "greenflow-customer-sequence-v1",
    );

  const currentKeys: string[] = [];

  for (
    let index = 0;
    index < window.localStorage.length;
    index += 1
  ) {
    const key =
      window.localStorage.key(index);

    if (
      key?.startsWith("greenflow-") &&
      !isRecoverySystemKey(key)
    ) {
      currentKeys.push(key);
    }
  }

  currentKeys.forEach((key) => {
    window.localStorage.removeItem(key);
  });

  Object.entries(point.items).forEach(
    ([key, value]) => {
      if (
        key.startsWith("greenflow-") &&
        !isRecoverySystemKey(key)
      ) {
        window.localStorage.setItem(
          key,
          value,
        );
      }
    },
  );

  preserveHighestInvoiceSequence(
    currentSettingsJson,
    window.localStorage.getItem(
      "greenflow-business-settings-v1",
    ),
  );

  preserveHighestCustomerSequence(
    currentCustomerSequence,
    window.localStorage.getItem(
      "greenflow-customer-sequence-v1",
    ),
    window.localStorage.getItem(
      "greenflow-customers-v1",
    ),
  );

  appendAuditEvent({
    action: "recovery-point-restored",
    point,
  });

  return point;
}

export async function deleteRecoveryPoint(
  recoveryPointId: string,
) {
  const point =
    await getRecoveryPoint(
      recoveryPointId,
    );

  if (!point) {
    return;
  }

  const database = await openRecoveryDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      RECOVERY_POINT_STORE,
      "readwrite",
    );

    transaction
      .objectStore(RECOVERY_POINT_STORE)
      .delete(recoveryPointId);

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error(
            "Could not delete the recovery point.",
          ),
      );
  });

  database.close();

  appendAuditEvent({
    action: "recovery-point-deleted",
    point,
  });
}

export function listRecoveryAuditEvents() {
  const saved =
    window.localStorage.getItem(
      AUDIT_STORAGE_KEY,
    );

  if (!saved) {
    return [] as RecoveryAuditEvent[];
  }

  try {
    const parsed =
      JSON.parse(saved) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (
          item,
        ): item is RecoveryAuditEvent =>
          Boolean(
            item &&
              typeof item === "object" &&
              "id" in item &&
              "createdAt" in item &&
              "action" in item &&
              "recoveryPointId" in item &&
              "label" in item &&
              "kind" in item,
          ),
      )
      .slice(0, MAX_AUDIT_EVENTS);
  } catch {
    return [];
  }
}

export function formatRecoveryPointDate(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function formatRecoveryPointSize(
  bytes: number,
) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(
      1,
      Math.round(bytes / 1024),
    )} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

async function getRecoveryPoint(
  recoveryPointId: string,
) {
  const database = await openRecoveryDatabase();

  const point =
    await new Promise<
      RecoveryPoint | undefined
    >((resolve, reject) => {
      const transaction =
        database.transaction(
          RECOVERY_POINT_STORE,
          "readonly",
        );

      const request = transaction
        .objectStore(
          RECOVERY_POINT_STORE,
        )
        .get(recoveryPointId);

      request.onsuccess = () => {
        resolve(
          request.result as
            | RecoveryPoint
            | undefined,
        );
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "Could not read the recovery point.",
            ),
        );
      };
    });

  database.close();

  return point;
}

async function trimRecoveryPoints() {
  const points =
    await listRecoveryPoints();

  if (
    points.length <=
    MAX_RECOVERY_POINTS
  ) {
    return;
  }

  const removable =
    points.slice(
      MAX_RECOVERY_POINTS,
    );

  const database =
    await openRecoveryDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction =
      database.transaction(
        RECOVERY_POINT_STORE,
        "readwrite",
      );

    const store =
      transaction.objectStore(
        RECOVERY_POINT_STORE,
      );

    removable.forEach((point) => {
      store.delete(point.id);
    });

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error(
            "Could not tidy old recovery points.",
          ),
      );
  });

  database.close();
}

function collectGreenFlowItems() {
  const items: Record<string, string> = {};

  for (
    let index = 0;
    index < window.localStorage.length;
    index += 1
  ) {
    const key =
      window.localStorage.key(index);

    if (
      !key ||
      !key.startsWith("greenflow-") ||
      isRecoverySystemKey(key)
    ) {
      continue;
    }

    const value =
      window.localStorage.getItem(key);

    if (value !== null) {
      items[key] = value;
    }
  }

  return items;
}

function isRecoverySystemKey(
  key: string,
) {
  return (
    key === AUDIT_STORAGE_KEY ||
    key ===
      LAST_AUTOMATIC_STORAGE_KEY
  );
}

function calculateSnapshotSize(
  items: Record<string, string>,
) {
  const text =
    JSON.stringify(items);

  return new Blob([text]).size;
}

function createSnapshotFingerprint(
  items: Record<string, string>,
) {
  const serialised = Object.keys(items)
    .sort()
    .map(
      (key) =>
        `${key}\u0000${items[key]}`,
    )
    .join("\u0001");

  let hash = 2166136261;

  for (
    let index = 0;
    index < serialised.length;
    index += 1
  ) {
    hash ^= serialised.charCodeAt(
      index,
    );

    hash = Math.imul(
      hash,
      16777619,
    );
  }

  return (
    hash >>> 0
  ).toString(16);
}

function createRecoveryPointId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `recovery-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function defaultLabel(
  kind: RecoveryPointKind,
) {
  if (kind === "automatic") {
    return "Automatic safety recovery point";
  }

  if (kind === "pre-restore") {
    return "Before recovery restore";
  }

  return "Manual recovery point";
}

function appendAuditEvent({
  action,
  point,
}: {
  action: RecoveryAuditEvent["action"];
  point: RecoveryPoint;
}) {
  const current =
    listRecoveryAuditEvents();

  const event: RecoveryAuditEvent = {
    id: createRecoveryPointId(),
    createdAt: new Date().toISOString(),
    action,
    recoveryPointId: point.id,
    label: point.label,
    kind: point.kind,
  };

  window.localStorage.setItem(
    AUDIT_STORAGE_KEY,
    JSON.stringify(
      [event, ...current].slice(
        0,
        MAX_AUDIT_EVENTS,
      ),
    ),
  );
}

function openRecoveryDatabase() {
  return new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request =
        window.indexedDB.open(
          DATABASE_NAME,
          DATABASE_VERSION,
        );

      request.onupgradeneeded = () => {
        const database =
          request.result;

        if (
          !database.objectStoreNames.contains(
            RECOVERY_POINT_STORE,
          )
        ) {
          database.createObjectStore(
            RECOVERY_POINT_STORE,
            {
              keyPath: "id",
            },
          );
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "GreenFlow recovery storage could not be opened.",
            ),
        );
      };
    },
  );
}

function preserveHighestInvoiceSequence(
  currentSettingsJson: string | null,
  restoredSettingsJson: string | null,
) {
  if (
    !currentSettingsJson ||
    !restoredSettingsJson
  ) {
    return;
  }

  try {
    const currentSettings =
      JSON.parse(
        currentSettingsJson,
      ) as {
        invoices?: {
          nextInvoiceNumber?: number;
        };
      };

    const restoredSettings =
      JSON.parse(
        restoredSettingsJson,
      ) as {
        invoices?: {
          nextInvoiceNumber?: number;
        };
      };

    const currentNext =
      Number(
        currentSettings.invoices
          ?.nextInvoiceNumber,
      );

    const restoredNext =
      Number(
        restoredSettings.invoices
          ?.nextInvoiceNumber,
      );

    if (
      !Number.isFinite(currentNext) ||
      !Number.isFinite(restoredNext) ||
      currentNext <= restoredNext
    ) {
      return;
    }

    window.localStorage.setItem(
      "greenflow-business-settings-v1",
      JSON.stringify({
        ...restoredSettings,
        invoices: {
          ...restoredSettings.invoices,
          nextInvoiceNumber:
            currentNext,
        },
      }),
    );
  } catch {
    // Leave the restored settings untouched.
  }
}

function preserveHighestCustomerSequence(
  currentSequenceValue: string | null,
  restoredSequenceValue: string | null,
  restoredCustomersJson: string | null,
) {
  const currentSequence =
    parsePositiveSafeInteger(
      currentSequenceValue,
    );

  const restoredSequence =
    parsePositiveSafeInteger(
      restoredSequenceValue,
    );

  let highestRestoredCustomer = 0;

  if (restoredCustomersJson) {
    try {
      const restoredCustomers =
        JSON.parse(
          restoredCustomersJson,
        ) as unknown;

      if (
        Array.isArray(
          restoredCustomers,
        )
      ) {
        highestRestoredCustomer =
          restoredCustomers.reduce(
            (
              highest,
              customer,
            ) => {
              if (
                !customer ||
                typeof customer !==
                  "object"
              ) {
                return highest;
              }

              const customerNumber =
                "customerNumber" in
                  customer
                  ? String(
                      (
                        customer as {
                          customerNumber?:
                            unknown;
                        }
                      ).customerNumber ??
                        "",
                    ).trim()
                  : "";

              if (
                !/^\d+$/.test(
                  customerNumber,
                )
              ) {
                return highest;
              }

              const numericValue =
                Number(
                  customerNumber,
                );

              return Number.isSafeInteger(
                numericValue,
              ) &&
                numericValue > 0
                ? Math.max(
                    highest,
                    numericValue,
                  )
                : highest;
            },
            0,
          );
      }
    } catch {
      // Sequence values can still protect the watermark.
    }
  }

  const highestSequence =
    Math.max(
      currentSequence,
      restoredSequence,
      highestRestoredCustomer,
    );

  if (highestSequence <= 0) {
    return;
  }

  window.localStorage.setItem(
    "greenflow-customer-sequence-v1",
    String(highestSequence),
  );
}

function parsePositiveSafeInteger(
  value: string | null,
) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : 0;
}
