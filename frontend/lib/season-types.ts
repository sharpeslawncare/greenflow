export type SeasonTreatmentRound = {
  visitNumber: number;
  treatmentName: string;
  gapAfterPreviousDays: number;
};

export type GroupSeasonDates = {
  groupNumber: number;

  treatmentDates: [
    string,
    string,
    string,
    string,
    string,
  ];
};

export type SeasonCalendar = {
  id: string;
  year: number;
  name: string;

  firstGroupStartDate: string;

  groupCount: number;
  groupsPerWorkingDay: number;

  avoidWeekends: boolean;
  avoidWednesdays: boolean;

  excludedDates: string[];

  treatmentRounds: [
    SeasonTreatmentRound,
    SeasonTreatmentRound,
    SeasonTreatmentRound,
    SeasonTreatmentRound,
    SeasonTreatmentRound,
  ];

  groupDates: GroupSeasonDates[];

  createdAt: string;
  updatedAt: string;
};