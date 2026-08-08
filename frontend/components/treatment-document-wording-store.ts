"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export type TreatmentDocumentWording = {
  title: string;
  description: string;
  mowingAdvice: string;
  wateringAdvice: string;
  safetyAdvice: string;
};

export type TreatmentDocumentWordingKey =
  | "earlyWinterMossControl"
  | "springWeedAndFeed"
  | "summerWeedAndFeed"
  | "autumnWeedAndFeed"
  | "winterMossControl"
  | "scarification"
  | "aeration"
  | "overseeding"
  | "fallback";

export type TreatmentDocumentWordingSettings =
  Record<
    TreatmentDocumentWordingKey,
    TreatmentDocumentWording
  >;

const STORAGE_KEY =
  "greenflow-treatment-document-wording-v1";

export const defaultTreatmentDocumentWording:
  TreatmentDocumentWordingSettings = {
    earlyWinterMossControl: {
      title: "Early Winter Moss Control",
      description:
        "Today we treated the lawn as part of its early-winter programme, focusing on moss control and helping the turf remain in the best possible condition through the colder months.",
      mowingAdvice:
        "Avoid mowing until the treatment has dried and the lawn is ready to be cut normally.",
      wateringAdvice:
        "Natural rainfall will normally help the treatment work into the lawn. Follow any specific advice left by your technician.",
      safetyAdvice:
        "Please keep children and pets off the treated lawn until it is fully dry.",
    },

    springWeedAndFeed: {
      title: "Spring Weed & Feed",
      description:
        "Today we applied the spring weed-and-feed treatment to encourage healthy growth and improve lawn colour while controlling broad-leaved weeds where required.",
      mowingAdvice:
        "Please allow 4–5 days after application before mowing so any weed control has time to be fully absorbed.",
      wateringAdvice:
        "Water the lawn within a few days if no useful rainfall is due. This helps the fertiliser dissolve and move into the turf.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry.",
    },

    summerWeedAndFeed: {
      title: "Summer Weed & Feed",
      description:
        "Today we applied the summer weed-and-feed treatment to maintain lawn colour and vigour while controlling broad-leaved weeds where required.",
      mowingAdvice:
        "Please allow 4–5 days after application before mowing where weed control has been applied.",
      wateringAdvice:
        "During dry weather, watering is particularly useful after feeding. Follow any watering guidance appropriate to current conditions.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry.",
    },

    autumnWeedAndFeed: {
      title: "Autumn Weed & Feed",
      description:
        "Today we applied the autumn weed-and-feed treatment to support the lawn as growth begins to slow and to control broad-leaved weeds where required.",
      mowingAdvice:
        "Please allow 4–5 days after application before mowing where weed control has been applied.",
      wateringAdvice:
        "Natural rainfall will often assist the treatment at this time of year. Water if advised and conditions remain dry.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry.",
    },

    winterMossControl: {
      title: "Winter Moss Control",
      description:
        "Today we applied the winter moss-control treatment as part of the seasonal programme, helping manage moss and support the lawn through the winter period.",
      mowingAdvice:
        "Avoid mowing until the treatment has dried. Normal mowing can then continue when conditions allow.",
      wateringAdvice:
        "No special watering is normally required unless your technician has advised otherwise.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry.",
    },

    scarification: {
      title: "Scarification",
      description:
        "Today the lawn was scarified to remove unwanted thatch and moss from the turf surface, improving conditions for healthier grass growth.",
      mowingAdvice:
        "The lawn may look untidy immediately after scarification. Delay mowing until the grass has recovered sufficiently and is actively growing.",
      wateringAdvice:
        "Keep the lawn adequately watered during recovery, particularly if conditions are dry.",
      safetyAdvice:
        "The surface may be loose or uneven immediately after the work, so please take care until the lawn settles.",
    },

    aeration: {
      title: "Aeration",
      description:
        "Today the lawn was aerated to relieve soil compaction and improve the movement of air, water and nutrients into the root zone.",
      mowingAdvice:
        "Normal mowing can usually continue once the lawn surface is suitable and any cores have had time to break down.",
      wateringAdvice:
        "Watering after aeration can be beneficial in dry conditions and helps moisture move into the newly opened soil.",
      safetyAdvice:
        "Please take care on the lawn immediately after aeration as the surface may be temporarily uneven.",
    },

    overseeding: {
      title: "Overseeding",
      description:
        "Today we overseeded the lawn to introduce fresh grass seed and improve turf density in thin or worn areas.",
      mowingAdvice:
        "Avoid mowing until the new grass has established sufficiently. When mowing resumes, use a sharp blade and avoid cutting too short.",
      wateringAdvice:
        "Keeping the seedbed consistently moist is essential during establishment. Light, regular watering is preferable to allowing the surface to dry out.",
      safetyAdvice:
        "Minimise traffic over newly seeded areas while the seed germinates and the young grass establishes.",
    },

    fallback: {
      title: "Lawn Treatment",
      description:
        "Today we carried out the planned lawn-care visit as part of your annual programme.",
      mowingAdvice:
        "Resume mowing when the lawn is dry and suitable to cut, unless your technician has advised otherwise.",
      wateringAdvice:
        "Follow any watering advice left by your technician and adjust according to current weather conditions.",
      safetyAdvice:
        "Please keep children and pets off treated areas until any applied treatment is fully dry.",
    },
  };

export function useTreatmentDocumentWording() {
  const [wording, setWording] =
    useState<TreatmentDocumentWordingSettings>(
      defaultTreatmentDocumentWording,
    );

  const [ready, setReady] =
    useState(false);

  const load = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!saved) {
      setWording(
        cloneDefaults(),
      );
      return;
    }

    try {
      const parsed = JSON.parse(saved) as
        Partial<TreatmentDocumentWordingSettings>;

      setWording(
        mergeWithDefaults(parsed),
      );
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );

      setWording(
        cloneDefaults(),
      );
    }
  }, []);

  useEffect(() => {
    load();
    setReady(true);
  }, [load]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(wording),
    );
  }, [wording, ready]);

  function updateTreatment(
    key: TreatmentDocumentWordingKey,
    updates: Partial<TreatmentDocumentWording>,
  ) {
    setWording((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...updates,
      },
    }));
  }

  function restoreTreatment(
    key: TreatmentDocumentWordingKey,
  ) {
    setWording((current) => ({
      ...current,
      [key]: {
        ...defaultTreatmentDocumentWording[
          key
        ],
      },
    }));
  }

  function restoreAll() {
    setWording(
      cloneDefaults(),
    );
  }

  return {
    wording,
    ready,
    updateTreatment,
    restoreTreatment,
    restoreAll,
  };
}

export function getTreatmentDocumentWordingKey(
  treatmentName: string,
): TreatmentDocumentWordingKey {
  const name =
    treatmentName
      .trim()
      .toLowerCase();

  if (
    name.includes("scarif")
  ) {
    return "scarification";
  }

  if (
    name.includes("aerat")
  ) {
    return "aeration";
  }

  if (
    name.includes("overseed") ||
    name.includes("seed")
  ) {
    return "overseeding";
  }

  if (
    name.includes("early") &&
    name.includes("winter") &&
    name.includes("moss")
  ) {
    return "earlyWinterMossControl";
  }

  if (
    name.includes("spring") &&
    (name.includes("weed") ||
      name.includes("feed"))
  ) {
    return "springWeedAndFeed";
  }

  if (
    name.includes("summer") &&
    (name.includes("weed") ||
      name.includes("feed"))
  ) {
    return "summerWeedAndFeed";
  }

  if (
    name.includes("autumn") &&
    (name.includes("weed") ||
      name.includes("feed"))
  ) {
    return "autumnWeedAndFeed";
  }

  if (
    name.includes("winter") &&
    name.includes("moss")
  ) {
    return "winterMossControl";
  }

  return "fallback";
}

function cloneDefaults():
  TreatmentDocumentWordingSettings {
  return JSON.parse(
    JSON.stringify(
      defaultTreatmentDocumentWording,
    ),
  ) as TreatmentDocumentWordingSettings;
}

function mergeWithDefaults(
  parsed:
    Partial<TreatmentDocumentWordingSettings>,
): TreatmentDocumentWordingSettings {
  const defaults =
    cloneDefaults();

  for (const key of Object.keys(
    defaults,
  ) as TreatmentDocumentWordingKey[]) {
    defaults[key] = {
      ...defaults[key],
      ...(parsed[key] ?? {}),
    };
  }

  return defaults;
}