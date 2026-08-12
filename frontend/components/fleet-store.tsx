"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type FleetVehicle = {
  id: string;
  number: number;
  name: string;
  active: boolean;
  createdAt: string;
};

export type FleetMutationResult = {
  success: boolean;
  message: string;
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

      const safeNumber =
        Number.isFinite(number) &&
        number > 0
          ? Math.floor(number)
          : index + 1;

      return {
        id:
          typeof item.id === "string" &&
          item.id
            ? item.id
            : `fleet-vehicle-${safeNumber}`,

        number:
          safeNumber,

        name:
          typeof item.name === "string" &&
          item.name.trim()
            ? item.name.trim()
            : `Van ${safeNumber}`,

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

  const vehiclesRef =
    useRef<FleetVehicle[]>(
      defaultVehicles,
    );

  const [ready, setReady] =
    useState(false);

  const reload =
    useCallback(() => {
      const next =
        readFleetStore().vehicles;

      vehiclesRef.current =
        next;

      setVehicles(next);
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

  useEffect(() => {
    vehiclesRef.current =
      vehicles;
  }, [vehicles]);

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

    vehiclesRef.current =
      normalised;

    setVehicles(normalised);

    writeFleetStore(
      normalised,
    );
  }

  function addVehicle(
    name?: string,
  ) {
    const current =
      vehiclesRef.current;

    const nextNumber =
      current.reduce(
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

      number:
        nextNumber,

      name:
        name?.trim() ||
        `Van ${nextNumber}`,

      active:
        true,

      createdAt:
        new Date().toISOString(),
    };

    saveVehicles([
      ...current,
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
  ): FleetMutationResult {
    const current =
      vehiclesRef.current;

    const existing =
      current.find(
        (vehicle) =>
          vehicle.id ===
          vehicleId,
      );

    if (!existing) {
      return {
        success: false,
        message:
          "The fleet vehicle could not be found, so no changes were saved.",
      };
    }

    const updated: FleetVehicle = {
      ...existing,
      ...updates,
      name:
        updates.name !==
        undefined
          ? updates.name.trim() ||
            existing.name
          : existing.name,
    };

    saveVehicles(
      current.map(
        (vehicle) =>
          vehicle.id ===
          vehicleId
            ? updated
            : vehicle,
      ),
    );

    return {
      success: true,
      message:
        "Fleet vehicle updated successfully.",
    };
  }

  function getVehicle(
    number: number,
  ) {
    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {
      return undefined;
    }

    const safeNumber =
      Math.floor(number);

    return vehiclesRef.current.find(
      (vehicle) =>
        vehicle.number ===
        safeNumber,
    );
  }

  function ensureVehicle(
    number: number,
  ) {
    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {
      return undefined;
    }

    const safeNumber =
      Math.floor(number);

    const existing =
      getVehicle(
        safeNumber,
      );

    if (existing) {
      return existing;
    }

    const current =
      vehiclesRef.current;

    const vehicle: FleetVehicle = {
      id:
        `fleet-vehicle-${safeNumber}`,
      number:
        safeNumber,
      name:
        `Van ${safeNumber}`,
      active:
        true,
      createdAt:
        new Date().toISOString(),
    };

    saveVehicles([
      ...current,
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