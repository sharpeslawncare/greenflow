export type CustomerStatus = "Active" | "Paused" | "Inactive";

export type Customer = {
  customerNumber: string;
  firstName: string;
  surname: string;
  fullName: string;
  address: string;
  postcode: string;
  email: string;
  homePhone: string;
  mobilePhone: string;
  lawnSize: number;
  groupNumber: number;
  treatmentPrice: number;
  status: CustomerStatus;
  vanNumber: number;
  nextVisit: string;
  lastVisit: string;
  lockedGate: boolean;
  dogOnProperty: boolean;
  preferredContact: "SMS" | "Email" | "Telephone";
  notes: string;
};

export const demoCustomers: Customer[] = [
  {
    customerNumber: "1001",
    firstName: "John",
    surname: "Smith",
    fullName: "John & Sarah Smith",
    address: "15 Highfield Close, Ainsdale",
    postcode: "PR8 3NL",
    email: "john.smith@example.com",
    homePhone: "01704 555101",
    mobilePhone: "07700 900101",
    lawnSize: 208,
    groupNumber: 7,
    treatmentPrice: 28,
    status: "Active",
    vanNumber: 1,
    nextVisit: "21 June 2028",
    lastVisit: "10 April 2028",
    lockedGate: false,
    dogOnProperty: true,
    preferredContact: "SMS",
    notes: "Clay soil. Recommend scarification next spring.",
  },
  {
    customerNumber: "1002",
    firstName: "Margaret",
    surname: "Wilson",
    fullName: "Margaret Wilson",
    address: "8 Manor Close, Ainsdale",
    postcode: "PR8 3PX",
    email: "margaret.wilson@example.com",
    homePhone: "01704 555102",
    mobilePhone: "07700 900102",
    lawnSize: 145,
    groupNumber: 7,
    treatmentPrice: 24,
    status: "Active",
    vanNumber: 1,
    nextVisit: "21 June 2028",
    lastVisit: "10 April 2028",
    lockedGate: true,
    dogOnProperty: false,
    preferredContact: "Telephone",
    notes: "Prefers a printed treatment report and pays by cheque.",
  },
  {
    customerNumber: "1003",
    firstName: "David",
    surname: "Harris",
    fullName: "David Harris",
    address: "42 Church Road, Ainsdale",
    postcode: "PR8 3BJ",
    email: "david.harris@example.com",
    homePhone: "",
    mobilePhone: "07700 900103",
    lawnSize: 320,
    groupNumber: 9,
    treatmentPrice: 38,
    status: "Active",
    vanNumber: 1,
    nextVisit: "23 June 2028",
    lastVisit: "12 April 2028",
    lockedGate: false,
    dogOnProperty: false,
    preferredContact: "Email",
    notes: "Pays by standing order. Aeration completed in spring 2027.",
  },
  {
    customerNumber: "1004",
    firstName: "Emma",
    surname: "Thompson",
    fullName: "Emma Thompson",
    address: "12 Oak Avenue, Formby",
    postcode: "L37 4AB",
    email: "emma.thompson@example.com",
    homePhone: "",
    mobilePhone: "07700 900104",
    lawnSize: 96,
    groupNumber: 4,
    treatmentPrice: 18,
    status: "Active",
    vanNumber: 1,
    nextVisit: "16 June 2028",
    lastVisit: "6 April 2028",
    lockedGate: true,
    dogOnProperty: true,
    preferredContact: "SMS",
    notes: "Gate reminder required. Small dog may be in rear garden.",
  },
  {
    customerNumber: "1005",
    firstName: "Peter",
    surname: "Johnson",
    fullName: "Peter Johnson",
    address: "7 Sandringham Drive, Formby",
    postcode: "L37 6PL",
    email: "peter.johnson@example.com",
    homePhone: "01704 555105",
    mobilePhone: "07700 900105",
    lawnSize: 480,
    groupNumber: 14,
    treatmentPrice: 52,
    status: "Paused",
    vanNumber: 1,
    nextVisit: "Not currently scheduled",
    lastVisit: "14 September 2027",
    lockedGate: false,
    dogOnProperty: false,
    preferredContact: "Telephone",
    notes: "Temporarily paused service for financial reasons.",
  },
];