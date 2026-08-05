export function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

export function isDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = parseDate(value);

  return (
    !Number.isNaN(date.getTime()) &&
    toDateValue(date) === value
  );
}

export function toDateValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayDateValue() {
  return toDateValue(new Date());
}

export function formatDate(value: string) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
}

export function formatDateLong(value: string) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

export function formatDateWithDay(value: string) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

export function addDaysToDate(
  value: string,
  days: number,
) {
  if (!isDateValue(value)) {
    return "";
  }

  const date = parseDate(value);

  date.setDate(
    date.getDate() + days,
  );

  return toDateValue(date);
}