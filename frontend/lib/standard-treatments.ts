export type StandardTreatment = {
  visitNumber: number;
  treatmentName: string;
  gapAfterPreviousDays: number;
};

export const STANDARD_TREATMENTS: readonly StandardTreatment[] = [
  {
    visitNumber: 1,
    treatmentName: "Early Winter Moss Control",
    gapAfterPreviousDays: 0,
  },
  {
    visitNumber: 2,
    treatmentName: "Spring Weed and Feed",
    gapAfterPreviousDays: 70,
  },
  {
    visitNumber: 3,
    treatmentName: "Summer Weed and Feed",
    gapAfterPreviousDays: 70,
  },
  {
    visitNumber: 4,
    treatmentName: "Autumn Weed and Feed",
    gapAfterPreviousDays: 70,
  },
  {
    visitNumber: 5,
    treatmentName: "Winter Moss Control",
    gapAfterPreviousDays: 70,
  },
];