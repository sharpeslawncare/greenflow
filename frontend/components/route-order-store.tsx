"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export type RouteOrder = {
  date: string;
  vanNumber: number;
  customerNumbers: string[];
  updatedAt: string;
};

type RouteItem = {
  customer: {
    customerNumber: string;
    fullName: string;
    postcode: string;
    vanNumber: number;
  };
};

const STORAGE_KEY =
  "greenflow-route-orders-v1";

function makeKey(
  date: string,
  vanNumber: number,
) {
  return `${date}::${vanNumber}`;
}

function normaliseCustomerNumbers(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          String(item ?? "").trim(),
        )
        .filter(Boolean),
    ),
  );
}

function readOrders(): RouteOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved =
    window.localStorage.getItem(
      STORAGE_KEY,
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(saved) as {
        orders?: unknown;
      };

    if (!Array.isArray(parsed.orders)) {
      return [];
    }

    return parsed.orders
      .filter(
        (
          order,
        ): order is Record<
          string,
          unknown
        > =>
          Boolean(
            order &&
              typeof order ===
                "object",
          ),
      )
      .map((order) => ({
        date:
          typeof order.date ===
          "string"
            ? order.date
            : "",
        vanNumber:
          Number(order.vanNumber),
        customerNumbers:
          normaliseCustomerNumbers(
            order.customerNumbers,
          ),
        updatedAt:
          typeof order.updatedAt ===
          "string"
            ? order.updatedAt
            : new Date(
                0,
              ).toISOString(),
      }))
      .filter(
        (order) =>
          Boolean(order.date) &&
          Number.isFinite(
            order.vanNumber,
          ) &&
          order.vanNumber > 0,
      );
  } catch {
    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    return [];
  }
}

function writeOrders(
  orders: RouteOrder[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      orders,
    }),
  );

  window.dispatchEvent(
    new CustomEvent(
      "greenflow:route-orders-updated",
    ),
  );
}

export function normalisePostcode(
  value: string,
) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();
}

export function postcodeSortKey(
  value: string,
) {
  const postcode =
    normalisePostcode(value);

  if (!postcode) {
    return "ZZZZZZZZ";
  }

  const outward =
    postcode.length > 3
      ? postcode.slice(
          0,
          postcode.length - 3,
        )
      : postcode;

  const inward =
    postcode.length > 3
      ? postcode.slice(-3)
      : "";

  return `${outward.padEnd(
    5,
    " ",
  )}:${inward}`;
}

export function useRouteOrderStore() {
  const [orders, setOrders] =
    useState<RouteOrder[]>([]);

  const [ready, setReady] =
    useState(false);

  const reload =
    useCallback(() => {
      setOrders(readOrders());
    }, []);

  useEffect(() => {
    reload();
    setReady(true);

    function handleStorage(
      event: StorageEvent,
    ) {
      if (
        event.key ===
        STORAGE_KEY
      ) {
        reload();
      }
    }

    function handleUpdate() {
      reload();
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    window.addEventListener(
      "greenflow:route-orders-updated",
      handleUpdate,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );

      window.removeEventListener(
        "greenflow:route-orders-updated",
        handleUpdate,
      );
    };
  }, [reload]);

  const ordersByKey =
    useMemo(
      () =>
        new Map(
          orders.map(
            (order) => [
              makeKey(
                order.date,
                order.vanNumber,
              ),
              order,
            ],
          ),
        ),
      [orders],
    );

  const getRouteOrder =
    useCallback(
      (
        date: string,
        vanNumber: number,
      ) =>
        ordersByKey.get(
          makeKey(
            date,
            vanNumber,
          ),
        )?.customerNumbers ?? [],
      [ordersByKey],
    );

  /*
   * This is the single authoritative route-order rule.
   *
   * Saved customers appear first in exactly the order
   * chosen by the user. Any new jobs that were not in
   * the saved route are appended afterwards without
   * disturbing the saved sequence.
   */
  const getOrderedCustomerNumbers =
    useCallback(
      (
        date: string,
        vanNumber: number,
        availableCustomerNumbers:
          string[],
      ): string[] => {
        const available =
          normaliseCustomerNumbers(
            availableCustomerNumbers,
          );

        const availableSet =
          new Set(available);

        const saved =
          getRouteOrder(
            date,
            vanNumber,
          ).filter(
            (customerNumber) =>
              availableSet.has(
                String(
                  customerNumber,
                ),
              ),
          );

        const savedNormalised =
          normaliseCustomerNumbers(
            saved,
          );

        const savedSet =
          new Set(
            savedNormalised,
          );

        return [
          ...savedNormalised,
          ...available.filter(
            (customerNumber) =>
              !savedSet.has(
                customerNumber,
              ),
          ),
        ];
      },
      [getRouteOrder],
    );

  const saveRouteOrder =
    useCallback(
      (
        date: string,
        vanNumber: number,
        customerNumbers: string[],
      ) => {
        const nextOrder: RouteOrder = {
          date,
          vanNumber,
          customerNumbers:
            normaliseCustomerNumbers(
              customerNumbers,
            ),
          updatedAt:
            new Date().toISOString(),
        };

        const key =
          makeKey(
            date,
            vanNumber,
          );

        setOrders((current) => {
          const next = [
            ...current.filter(
              (order) =>
                makeKey(
                  order.date,
                  order.vanNumber,
                ) !== key,
            ),
            nextOrder,
          ];

          writeOrders(next);
          return next;
        });
      },
      [],
    );

  const clearRouteOrder =
    useCallback(
      (
        date: string,
        vanNumber: number,
      ) => {
        const key =
          makeKey(
            date,
            vanNumber,
          );

        setOrders((current) => {
          const next =
            current.filter(
              (order) =>
                makeKey(
                  order.date,
                  order.vanNumber,
                ) !== key,
            );

          writeOrders(next);
          return next;
        });
      },
      [],
    );

  const createPostcodeOrder =
    useCallback(
      (
        customers: Array<{
          customerNumber: string;
          fullName: string;
          postcode: string;
        }>,
      ) =>
        customers
          .slice()
          .sort(
            (first, second) => {
              const postcodeResult =
                postcodeSortKey(
                  first.postcode,
                ).localeCompare(
                  postcodeSortKey(
                    second.postcode,
                  ),
                );

              if (
                postcodeResult !== 0
              ) {
                return postcodeResult;
              }

              return first.fullName.localeCompare(
                second.fullName,
              );
            },
          )
          .map(
            (customer) =>
              String(
                customer.customerNumber,
              ),
          ),
      [],
    );

  const sortBySavedRoute =
    useCallback(
      function sortBySavedRoute<
        T extends RouteItem,
      >(
        items: T[],
        date: string,
      ): T[] {
        const vanNumbers =
          Array.from(
            new Set(
              items.map(
                (item) =>
                  item.customer
                    .vanNumber,
              ),
            ),
          ).sort(
            (first, second) =>
              first - second,
          );

        return vanNumbers.flatMap(
          (vanNumber) => {
            const vanItems =
              items.filter(
                (item) =>
                  item.customer
                    .vanNumber ===
                  vanNumber,
              );

            const orderedNumbers =
              getOrderedCustomerNumbers(
                date,
                vanNumber,
                vanItems.map(
                  (item) =>
                    item.customer
                      .customerNumber,
                ),
              );

            const orderIndex =
              new Map(
                orderedNumbers.map(
                  (
                    customerNumber,
                    index,
                  ) => [
                    customerNumber,
                    index,
                  ],
                ),
              );

            return vanItems
              .slice()
              .sort(
                (
                  first,
                  second,
                ) =>
                  (orderIndex.get(
                    first.customer
                      .customerNumber,
                  ) ??
                    Number.MAX_SAFE_INTEGER) -
                  (orderIndex.get(
                    second.customer
                      .customerNumber,
                  ) ??
                    Number.MAX_SAFE_INTEGER),
              );
          },
        );
      },
      [getOrderedCustomerNumbers],
    );

  return {
    ready,
    getRouteOrder,
    getOrderedCustomerNumbers,
    saveRouteOrder,
    clearRouteOrder,
    createPostcodeOrder,
    sortBySavedRoute,
  };
}