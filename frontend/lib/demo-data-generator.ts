import type { Customer } from "@/lib/demo-customers";

export type DemoCustomerCount = 20 | 50 | 100 | 250 | 500;

export type DemoDataOptions = {
  customerCount: DemoCustomerCount;
  groupCount?: number;
  vanNumber?: number;
  firstCustomerNumber?: number;
};

const firstNames = [
  "Oliver", "Amelia", "George", "Isla", "Harry",
  "Ava", "Jack", "Mia", "Charlie", "Grace",
  "Thomas", "Sophie", "James", "Emily", "William",
  "Ella", "Henry", "Lucy", "Daniel", "Freya",
];

const surnames = [
  "Smith", "Jones", "Taylor", "Brown", "Wilson",
  "Davies", "Evans", "Thomas", "Johnson", "Roberts",
  "Walker", "Wright", "Thompson", "White", "Hughes",
  "Edwards", "Green", "Hall", "Lewis", "Harris",
];

const roads = [
  "Highfield Close", "Oak Avenue", "Church Road", "Willow Drive", "Manor Close",
  "Victoria Gardens", "Crescent Avenue", "Mill Lane", "Freshfield Road", "Cambridge Road",
  "Sandringham Drive", "Liverpool Road", "Roe Lane", "Balmoral Drive", "College Road",
  "Meadow Close", "Orchard View", "Moor Lane", "Coronation Road", "Elm Park",
];

const locations = [
  { town: "Ainsdale", postcodePrefix: "PR8" },
  { town: "Birkdale", postcodePrefix: "PR8" },
  { town: "Southport", postcodePrefix: "PR9" },
  { town: "Formby", postcodePrefix: "L37" },
  { town: "Hightown", postcodePrefix: "L38" },
  { town: "Crosby", postcodePrefix: "L23" },
];

const notes = [
  "Front and rear lawns.",
  "Gate reminder required before every visit.",
  "Dog may be in the rear garden.",
  "Customer prefers morning visits.",
  "Established lawn with straightforward access.",
  "Shaded rear lawn; monitor moss levels.",
  "Customer normally works from home.",
  "Large rear lawn with side access.",
  "Small front lawn and medium rear lawn.",
  "Clay soil; monitor drainage after heavy rain.",
];

const preferredContacts: Customer["preferredContact"][] = [
  "SMS",
  "Email",
  "Telephone",
];

export function generateDemoCustomers({
  customerCount,
  groupCount = 20,
  vanNumber = 1,
  firstCustomerNumber = 1001,
}: DemoDataOptions): Customer[] {
  const safeGroupCount = Math.max(1, Math.min(groupCount, customerCount));

  return Array.from({ length: customerCount }, (_, index) => {
    const customerNumber = firstCustomerNumber + index;
    const groupNumber = distributeAcrossGroups(
      index,
      customerCount,
      safeGroupCount,
    );

    const firstName = firstNames[index % firstNames.length];
    const surname = surnames[(index * 3) % surnames.length];
    const location = locations[(groupNumber - 1) % locations.length];
    const houseNumber = 3 + ((index * 7) % 91);
    const road = roads[(index * 5 + groupNumber) % roads.length];
    const lawnSize = 60 + ((index * 37) % 541);
    const treatmentPrice = Math.max(18, Math.round(16 + lawnSize * 0.095));

    return {
      customerNumber: String(customerNumber),
      firstName,
      surname,
      fullName: `${firstName} ${surname}`,
      address: `${houseNumber} ${road}, ${location.town}`,
      postcode: createDemoPostcode(
        location.postcodePrefix,
        index,
        groupNumber,
      ),
      email: `${firstName.toLowerCase()}.${surname.toLowerCase()}${customerNumber}@example.com`,
      homePhone: index % 3 === 0 ? createHomePhone(index) : "",
      mobilePhone: createMobilePhone(index),
      lawnSize,
      groupNumber,
      treatmentPrice,
      status: "Active",
      vanNumber,
      nextVisit: "Not yet scheduled",
      lastVisit: "No previous visit",
      lockedGate: index % 4 === 1,
      dogOnProperty: index % 5 === 2,
      preferredContact: preferredContacts[index % preferredContacts.length],
      notes: notes[index % notes.length],
    };
  });
}

export function summariseDemoGroups(customers: Customer[]) {
  const counts = new Map<number, number>();

  customers.forEach((customer) => {
    counts.set(
      customer.groupNumber,
      (counts.get(customer.groupNumber) ?? 0) + 1,
    );
  });

  return Array.from(counts.entries())
    .map(([groupNumber, customerCount]) => ({
      groupNumber,
      customerCount,
    }))
    .sort((first, second) => first.groupNumber - second.groupNumber);
}

function distributeAcrossGroups(
  index: number,
  customerCount: number,
  groupCount: number,
) {
  return Math.min(
    groupCount,
    Math.floor((index * groupCount) / customerCount) + 1,
  );
}

function createDemoPostcode(
  prefix: string,
  index: number,
  groupNumber: number,
) {
  const district = 1 + (groupNumber % 8);
  const firstLetter = String.fromCharCode(65 + (index % 20));
  const secondLetter = String.fromCharCode(65 + ((index * 7) % 20));

  return `${prefix} ${district}${firstLetter}${secondLetter}`;
}

function createMobilePhone(index: number) {
  return `07700 ${String(900000 + index).slice(-6)}`;
}

function createHomePhone(index: number) {
  return `01704 ${String(555000 + index).slice(-6)}`;
}