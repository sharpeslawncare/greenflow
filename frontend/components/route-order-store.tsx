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
    const parsed = JSON.parse(saved) as {
      orders?: unknown;
    };

    if (!Array.isArray(parsed.orders)) {
      return [];
    }

    return parsed.orders.filter(
      (
        order,
      ): order is RouteOrder => {
        if (
          !order ||
          typeof order !== "object"
        ) {
          return false;
        }

        const candidate =
          order as Partial<RouteOrder>;

        return (
          typeof candidate.date ===
            "string" &&
          typeof candidate.vanNumber ===
            "number" &&
          Array.isArray(
            candidate.customerNumbers,
          )
        );
      },
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
            Array.from(
              new Set(
                customerNumbers.filter(
                  Boolean,
                ),
              ),
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
              customer.customerNumber,
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
        return items
          .slice()
          .sort(
            (first, second) => {
              if (
                first.customer.vanNumber !==
                second.customer.vanNumber
              ) {
                return (
                  first.customer.vanNumber -
                  second.customer.vanNumber
                );
              }

              const order =
                getRouteOrder(
                  date,
                  first.customer.vanNumber,
                );

              const firstIndex =
                order.indexOf(
                  first.customer.customerNumber,
                );

              const secondIndex =
                order.indexOf(
                  second.customer.customerNumber,
                );

              if (
                firstIndex >= 0 ||
                secondIndex >= 0
              ) {
                if (
                  firstIndex < 0
                ) {
                  return 1;
                }

                if (
                  secondIndex < 0
                ) {
                  return -1;
                }

                return (
                  firstIndex -
                  secondIndex
                );
              }

              const postcodeResult =
                postcodeSortKey(
                  first.customer.postcode,
                ).localeCompare(
                  postcodeSortKey(
                    second.customer.postcode,
                  ),
                );

              if (
                postcodeResult !== 0
              ) {
                return postcodeResult;
              }

              return first.customer.fullName.localeCompare(
                second.customer.fullName,
              );
            },
          );
      },
      [getRouteOrder],
    );

  return {
    ready,
    getRouteOrder,
    saveRouteOrder,
    clearRouteOrder,
    createPostcodeOrder,
    sortBySavedRoute,
  };
}