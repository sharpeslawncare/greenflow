"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export type FleetVehicle = {
  id: string;
  number: number;
  name: string;
  active: boolean;
  createdAt: string;
};

type FleetStore = {
  vehicles: FleetVehicle[];
};

const STORAGE_KEY =
  "greenflow-fleet-v2";

const defaultVehicles: FleetVehicle[] = [
  {
    id: "fleet-van-1",
    number: 1,
    name: "Van 1",
    active: true,
    createdAt: new Date(0).toISOString(),
  },
];

function normaliseVehicles(
  value: unknown,
): FleetVehicle[] {
  if (!Array.isArray(value)) {
    return defaultVehicles;
  }

  const vehicles = value
    .filter(
      (
        item,
      ): item is Partial<FleetVehicle> =>
        Boolean(
          item &&
            typeof item === "object",
        ),
    )
    .map((item, index) => {
      const number =
        Number(item.number);

      return {
        id:
          typeof item.id === "string" &&
          item.id
            ? item.id
            : `fleet-vehicle-${number || index + 1}`,

        number:
          Number.isFinite(number) &&
          number > 0
            ? Math.floor(number)
            : index + 1,

        name:
          typeof item.name === "string" &&
          item.name.trim()
            ? item.name.trim()
            : `Van ${number || index + 1}`,

        active:
          item.active !== false,

        createdAt:
          typeof item.createdAt ===
            "string" &&
          item.createdAt
            ? item.createdAt
            : new Date().toISOString(),
      };
    });

  const unique = Array.from(
    new Map(
      vehicles.map((vehicle) => [
        vehicle.number,
        vehicle,
      ]),
    ).values(),
  ).sort(
    (first, second) =>
      first.number - second.number,
  );

  return unique.length > 0
    ? unique
    : defaultVehicles;
}

function readFleetStore(): FleetStore {
  if (
    typeof window === "undefined"
  ) {
    return {
      vehicles:
        defaultVehicles,
    };
  }

  const saved =
    window.localStorage.getItem(
      STORAGE_KEY,
    );

  if (!saved) {
    return {
      vehicles:
        defaultVehicles,
    };
  }

  try {
    const parsed =
      JSON.parse(saved) as Partial<FleetStore>;

    return {
      vehicles:
        normaliseVehicles(
          parsed.vehicles,
        ),
    };
  } catch {
    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    return {
      vehicles:
        defaultVehicles,
    };
  }
}

function writeFleetStore(
  vehicles: FleetVehicle[],
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      vehicles,
    }),
  );

  window.dispatchEvent(
    new CustomEvent(
      "greenflow:fleet-updated",
    ),
  );
}

export function useFleetStore() {
  const [vehicles, setVehicles] =
    useState<FleetVehicle[]>(
      defaultVehicles,
    );

  const [ready, setReady] =
    useState(false);

  const reload =
    useCallback(() => {
      setVehicles(
        readFleetStore().vehicles,
      );
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

    function handleFleetUpdated() {
      reload();
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    window.addEventListener(
      "greenflow:fleet-updated",
      handleFleetUpdated,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );

      window.removeEventListener(
        "greenflow:fleet-updated",
        handleFleetUpdated,
      );
    };
  }, [reload]);

  const activeVehicles =
    useMemo(
      () =>
        vehicles
          .filter(
            (vehicle) =>
              vehicle.active,
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.number -
              second.number,
          ),
      [vehicles],
    );

  function saveVehicles(
    nextVehicles: FleetVehicle[],
  ) {
    const normalised =
      normaliseVehicles(
        nextVehicles,
      );

    setVehicles(normalised);
    writeFleetStore(
      normalised,
    );
  }

  function addVehicle(
    name?: string,
  ) {
    const nextNumber =
      vehicles.reduce(
        (
          highest,
          vehicle,
        ) =>
          Math.max(
            highest,
            vehicle.number,
          ),
        0,
      ) + 1;

    const vehicle: FleetVehicle = {
      id: `fleet-vehicle-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      number: nextNumber,

      name:
        name?.trim() ||
        `Van ${nextNumber}`,

      active: true,

      createdAt:
        new Date().toISOString(),
    };

    saveVehicles([
      ...vehicles,
      vehicle,
    ]);

    return vehicle;
  }

  function updateVehicle(
    vehicleId: string,
    updates: Partial<
      Pick<
        FleetVehicle,
        "name" | "active"
      >
    >,
  ) {
    saveVehicles(
      vehicles.map(
        (vehicle) =>
          vehicle.id ===
          vehicleId
            ? {
                ...vehicle,
                ...updates,
                name:
                  updates.name !==
                  undefined
                    ? updates.name.trim() ||
                      vehicle.name
                    : vehicle.name,
              }
            : vehicle,
      ),
    );
  }

  function getVehicle(
    number: number,
  ) {
    return vehicles.find(
      (vehicle) =>
        vehicle.number ===
        number,
    );
  }

  function ensureVehicle(
    number: number,
  ) {
    const existing =
      getVehicle(number);

    if (existing) {
      return existing;
    }

    const vehicle: FleetVehicle = {
      id: `fleet-vehicle-${number}`,
      number,
      name: `Van ${number}`,
      active: true,
      createdAt:
        new Date().toISOString(),
    };

    saveVehicles([
      ...vehicles,
      vehicle,
    ]);

    return vehicle;
  }

  function restoreDefaultFleet() {
    saveVehicles(
      defaultVehicles,
    );
  }

  return {
    vehicles,
    activeVehicles,
    ready,
    addVehicle,
    updateVehicle,
    getVehicle,
    ensureVehicle,
    restoreDefaultFleet,
  };
}