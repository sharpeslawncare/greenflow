"use client";

import type {
  ChangeEvent,
} from "react";

type BackupRestoreTabProps = {
  lastBackupAt: string;
  onCreateBackup: () => void;
  onRestoreBackup: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
};

export function BackupRestoreTab({
  lastBackupAt,
  onCreateBackup,
  onRestoreBackup,
}: {
  lastBackupAt: string;
  onCreateBackup: () => void;
  onRestoreBackup: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Backup and restore"
        description="Create a portable copy of all GreenFlow browser data before resets, testing or major changes."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
            Create backup
          </div>

          <h3 className="mt-2 text-2xl font-bold text-green-950">
            Download GreenFlow data
          </h3>

          <p className="mt-2 text-sm leading-6 text-green-800">
            Downloads customers, programmes, treatments, chemicals, stock, routes, fleet, settings and saved working-day data as one JSON file.
          </p>

          <button
            type="button"
            onClick={onCreateBackup}
            className="mt-6 rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
          >
            Create Backup
          </button>

          <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-sm text-green-900">
            <strong>Last backup:</strong>{" "}
            {lastBackupAt
              ? formatBackupDate(
                  lastBackupAt,
                )
              : "No backup recorded in this browser."}
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
            Restore backup
          </div>

          <h3 className="mt-2 text-2xl font-bold text-amber-950">
            Replace current browser data
          </h3>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Select a GreenFlow backup file. The restore process replaces existing GreenFlow data in this browser and then reloads the application.
          </p>

          <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-amber-700 px-5 py-3 text-sm font-bold text-white hover:bg-amber-800">
            Choose Backup File

            <input
              type="file"
              accept="application/json,.json"
              onChange={
                onRestoreBackup
              }
              className="hidden"
            />
          </label>

          <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4 text-sm leading-6 text-amber-900">
            Create a fresh backup before restoring another file. Restore does not merge data; it replaces GreenFlow’s current browser records.
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Backups are local JSON files. Keep them somewhere secure, such as your GreenFlow project backup folder or OneDrive.
      </div>
    </div>
  );
}

function isGreenFlowBackup(
  value: unknown,
): value is {
  application: "GreenFlow";
  version: number;
  createdAt: string;
  items: Record<string, string>;
} {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as {
      application?: unknown;
      version?: unknown;
      createdAt?: unknown;
      items?: unknown;
    };

  return (
    candidate.application ===
      "GreenFlow" &&
    typeof candidate.version ===
      "number" &&
    typeof candidate.createdAt ===
      "string" &&
    Boolean(
      candidate.items &&
        typeof candidate.items ===
          "object" &&
        !Array.isArray(
          candidate.items,
        ),
    ) &&
    Object.values(
      candidate.items as Record<
        string,
        unknown
      >,
    ).every(
      (item) =>
        typeof item === "string",
    )
  );
}

function formatBackupDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
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