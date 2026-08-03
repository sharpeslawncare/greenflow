"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  demoCustomers,
  type Customer,
} from "@/lib/demo-customers";

type CustomerStoreValue = {
  customers: Customer[];
  ready: boolean;
  addCustomer: (customer: Customer) => {
    success: boolean;
    message: string;
  };
  updateCustomer: (customer: Customer) => void;
  getCustomer: (customerNumber: string) => Customer | undefined;
  getNextCustomerNumber: () => string;
  restoreDemoCustomers: () => void;
};

const CustomerStoreContext = createContext<CustomerStoreValue | null>(null);

const STORAGE_KEY = "greenflow-customers-v1";

export function CustomerStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedCustomers = window.localStorage.getItem(STORAGE_KEY);

    if (savedCustomers) {
      try {
        const parsedCustomers = JSON.parse(savedCustomers) as Customer[];

        if (Array.isArray(parsedCustomers)) {
          setCustomers(parsedCustomers);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(customers),
    );
  }, [customers, ready]);

  function addCustomer(customer: Customer) {
    const duplicate = customers.some(
      (existingCustomer) =>
        existingCustomer.customerNumber === customer.customerNumber,
    );

    if (duplicate) {
      return {
        success: false,
        message: `Customer number ${customer.customerNumber} already exists.`,
      };
    }

    setCustomers((currentCustomers) =>
      [...currentCustomers, customer].sort(
        (firstCustomer, secondCustomer) =>
          Number(firstCustomer.customerNumber) -
          Number(secondCustomer.customerNumber),
      ),
    );

    return {
      success: true,
      message: "Customer added successfully.",
    };
  }

  function updateCustomer(updatedCustomer: Customer) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.customerNumber === updatedCustomer.customerNumber
          ? updatedCustomer
          : customer,
      ),
    );
  }

  function getCustomer(customerNumber: string) {
    return customers.find(
      (customer) => customer.customerNumber === customerNumber,
    );
  }

  function getNextCustomerNumber() {
    const highestNumber = customers.reduce((highest, customer) => {
      const customerNumber = Number(customer.customerNumber);

      return Number.isFinite(customerNumber)
        ? Math.max(highest, customerNumber)
        : highest;
    }, 1000);

    return String(highestNumber + 1);
  }

  function restoreDemoCustomers() {
    setCustomers(demoCustomers);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo<CustomerStoreValue>(
    () => ({
      customers,
      ready,
      addCustomer,
      updateCustomer,
      getCustomer,
      getNextCustomerNumber,
      restoreDemoCustomers,
    }),
    [customers, ready],
  );

  return (
    <CustomerStoreContext.Provider value={value}>
      {children}
    </CustomerStoreContext.Provider>
  );
}

export function useCustomerStore() {
  const context = useContext(CustomerStoreContext);

  if (!context) {
    throw new Error(
      "useCustomerStore must be used inside CustomerStoreProvider.",
    );
  }

  return context;
}