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

export type RouteOrderSaveResult = {
  success: boolean;
  message: string;
};
type RouteItem = {
  customer: {
    customerNumber: string;
    fullName: string;
    postcode: string;
    vanNumber: number;
  };
};


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


async function persistRouteOrderToPostgreSQL(
  routeOrder: RouteOrder,
): Promise<RouteOrderSaveResult> {
  try {
    const response = await fetch(
      "/api/route-orders",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          routeOrder,
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => null)) as {
        error?: string;
      } | null;

      return {
        success: false,
        message:
          payload?.error ||
          "Route order could not be saved to PostgreSQL.",
      };
    }

    return {
      success: true,
      message:
        "Route order saved to PostgreSQL.",
    };
  } catch (error) {
    console.error(
      "Failed to save GreenFlow route order to PostgreSQL:",
      error,
    );

    return {
      success: false,
      message:
        "Route order could not be saved to PostgreSQL.",
    };
  }
}

async function deleteRouteOrderFromPostgreSQL(
  date: string,
  vanNumber: number,
): Promise<RouteOrderSaveResult> {
  try {
    const response = await fetch(
      "/api/route-orders",
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          date,
          vanNumber,
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => null)) as {
        error?: string;
      } | null;

      return {
        success: false,
        message:
          payload?.error ||
          "Route order could not be deleted from PostgreSQL.",
      };
    }

    return {
      success: true,
      message:
        "Route order deleted from PostgreSQL.",
    };
  } catch (error) {
    console.error(
      "Failed to delete GreenFlow route order from PostgreSQL:",
      error,
    );

    return {
      success: false,
      message:
        "Route order could not be deleted from PostgreSQL.",
    };
  }
}
async function clearAllRouteOrdersFromPostgreSQL(): Promise<RouteOrderSaveResult> {
  try {
    const response = await fetch(
      "/api/route-orders",
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          clearAll: true,
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => null)) as {
        error?: string;
      } | null;

      return {
        success: false,
        message:
          payload?.error ||
          "Route orders could not be cleared from PostgreSQL.",
      };
    }

    return {
      success: true,
      message:
        "Route orders cleared from PostgreSQL.",
    };
  } catch (error) {
    console.error(
      "Failed to clear GreenFlow route orders from PostgreSQL:",
      error,
    );

    return {
      success: false,
      message:
        "Route orders could not be cleared from PostgreSQL.",
    };
  }
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

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromPostgreSQL() {
      try {
        const response = await fetch(
          "/api/route-orders",
        );

        if (!response.ok) {
          throw new Error(
            `Route order hydration failed with status ${response.status}.`,
          );
        }

        const payload = (await response.json()) as {
          routeOrders?: unknown;
        };

        if (!Array.isArray(payload.routeOrders)) {
          throw new Error(
            "Route order hydration returned an invalid payload.",
          );
        }

        const databaseOrders =
          payload.routeOrders
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

        if (!cancelled) {
          setOrders(databaseOrders);
        }
      } catch (error) {
        console.error(
          "Failed to hydrate GreenFlow route orders from PostgreSQL:",
          error,
        );

        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void hydrateFromPostgreSQL();

    return () => {
      cancelled = true;
    };
  }, []);
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
      async (
        date: string,
        vanNumber: number,
        customerNumbers: string[],
      ): Promise<RouteOrderSaveResult> => {
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

        const result =
          await persistRouteOrderToPostgreSQL(
            nextOrder,
          );

        if (!result.success) {
          return result;
        }

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

          return next;
        });

        return result;
      },
      [],
    );

  const clearRouteOrder =
    useCallback(
      async (
        date: string,
        vanNumber: number,
      ): Promise<RouteOrderSaveResult> => {
        const result =
          await deleteRouteOrderFromPostgreSQL(
            date,
            vanNumber,
          );

        if (!result.success) {
          return result;
        }

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

          return next;
        });

        return result;
      },
      [],
    );
  const clearAllRouteOrders =
    useCallback(
      async (): Promise<RouteOrderSaveResult> => {
        const result =
          await clearAllRouteOrdersFromPostgreSQL();

        if (!result.success) {
          return result;
        }

        setOrders([]);
        return result;
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
    clearAllRouteOrders,
    createPostcodeOrder,
    sortBySavedRoute,
  };
}