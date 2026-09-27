export type StandardTreatment = {
  visitNumber: number;
  treatmentName: string;
  gapAfterPreviousDays: number;
};

export const STANDARD_TREATMENTS: readonly StandardTreatment[] = [
  {
    visitNumber: 1,
    treatmentName: "Spring Weed and Feed",
    gapAfterPreviousDays: 0,
  },
  {
    visitNumber: 2,
    treatmentName: "Summer Weed and Feed",
    gapAfterPreviousDays: 70,
  },
  {
    visitNumber: 3,
    treatmentName: "Autumn Weed and Feed",
    gapAfterPreviousDays: 70,
  },
  {
    visitNumber: 4,
    treatmentName: "Winter Moss Control 1",
    gapAfterPreviousDays: 70,
  },
  {
    visitNumber: 5,
    treatmentName: "Winter Moss Control 2",
    gapAfterPreviousDays: 70,
  },
];