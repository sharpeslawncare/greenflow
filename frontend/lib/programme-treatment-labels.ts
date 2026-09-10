export type ProgrammeTreatmentRound = 1 | 2 | 3 | 4 | 5;

type ProgrammeTreatmentDefinition = {
  round: ProgrammeTreatmentRound;
  code: `T${ProgrammeTreatmentRound}`;
  name: string;
};

export const PROGRAMME_TREATMENTS: readonly ProgrammeTreatmentDefinition[] = [
  { round: 1, code: "T1", name: "Spring Weed and Feed" },
  { round: 2, code: "T2", name: "Summer Weed and Feed" },
  { round: 3, code: "T3", name: "Autumn Weed and Feed" },
  { round: 4, code: "T4", name: "Winter Moss Control 1" },
  { round: 5, code: "T5", name: "Winter Moss Control 2" },
] as const;

function normaliseTreatmentName(value: string) {
  return value
    .trim()
    .replace(/^t[1-5]\s*[·:\-–—]\s*/i, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getProgrammeTreatmentRound(
  treatmentName: string,
): ProgrammeTreatmentRound | null {
  const normalised = normaliseTreatmentName(treatmentName);

  const match = PROGRAMME_TREATMENTS.find(
    (treatment) =>
      normaliseTreatmentName(treatment.name) === normalised,
  );

  return match?.round ?? null;
}

export function getProgrammeTreatmentCode(
  treatmentName: string,
): `T${ProgrammeTreatmentRound}` | null {
  const round = getProgrammeTreatmentRound(treatmentName);
  return round ? `T${round}` : null;
}

export function formatProgrammeTreatmentLabel(
  treatmentName: string,
) {
  const code = getProgrammeTreatmentCode(treatmentName);
  return code ? `${code} · ${treatmentName}` : treatmentName;
}

export function formatProgrammeTreatmentLabelForCustomer(
  treatmentName: string,
) {
  // Customer-facing paperwork deliberately keeps the descriptive treatment name.
  return treatmentName;
}
