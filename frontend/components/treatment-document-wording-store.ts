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
      title: "Early Winter Moss Treatment",
      description:
        "Today we carried out the early winter moss treatment. This application is designed to suppress moss activity as conditions become cooler and damper, while helping the lawn remain in good condition through the winter period. Moss may darken after treatment before gradually breaking down.",
      mowingAdvice:
        "Allow the treatment to dry fully before mowing. After that, continue mowing when conditions allow, keeping the mower slightly higher during cold or wet weather and avoiding cutting the lawn too short.",
      wateringAdvice:
        "No special watering is normally required at this time of year. Natural rainfall is usually sufficient unless your technician has advised otherwise.",
      safetyAdvice:
        "Please keep children and pets off the treated lawn until it is fully dry. Avoid walking over heavily treated areas while they are wet.",
    },

    springWeedAndFeed: {
      title: "Spring Weed & Feed",
      description:
        "Today we carried out the spring weed-and-feed treatment. The feed supports fresh growth, colour and recovery after winter, while selective weed control may be used where required to reduce common broad-leaved lawn weeds. Results develop gradually as the grass responds to feeding and treated weeds begin to distort and decline.",
      mowingAdvice:
        "Where weed control has been applied, avoid mowing for around 4–5 days after treatment so the herbicide has time to move through the weeds. After this, resume regular mowing and avoid removing more than one third of the grass height at any one cut.",
      wateringAdvice:
        "If useful rainfall does not arrive within a few days, watering can help the fertiliser dissolve and move into the turf. Water thoroughly rather than little and often once the treatment is dry.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry. Once dry, normal use of the lawn can resume.",
    },

    summerWeedAndFeed: {
      title: "Summer Weed & Feed",
      description:
        "Today we carried out the summer weed-and-feed treatment. This treatment helps maintain lawn colour and density during the growing season and, where required, controls broad-leaved weeds that are actively growing. During hot or dry weather the lawn's response may be slower until moisture returns.",
      mowingAdvice:
        "Where weed control has been applied, avoid mowing for around 4–5 days after treatment. During hot or dry conditions, raise the mowing height slightly and avoid scalping the lawn.",
      wateringAdvice:
        "Watering is especially beneficial during prolonged dry weather. Once the treatment has dried, give the lawn a thorough watering if no meaningful rainfall is expected so the feed can move into the root zone.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry. Once dry, normal access can resume.",
    },

    autumnWeedAndFeed: {
      title: "Autumn Weed & Feed",
      description:
        "Today we carried out the autumn weed-and-feed treatment. The seasonal feed supports turf strength and colour as growth begins to slow, while selective weed control may be used where required to reduce broad-leaved weeds before winter. The aim is to leave the lawn in a stronger condition going into the colder months.",
      mowingAdvice:
        "Where weed control has been applied, avoid mowing for around 4–5 days after treatment. Continue mowing while the grass is still growing, gradually raising the cutting height as conditions cool.",
      wateringAdvice:
        "Natural autumn rainfall will often provide enough moisture for the treatment. If conditions remain unusually dry, water once the treatment has fully dried.",
      safetyAdvice:
        "Please keep children and pets off the lawn until the treatment is fully dry. Once dry, normal use of the lawn can resume.",
    },

    winterMossControl: {
      title: "Winter Moss Treatment",
      description:
        "Today we carried out the winter moss treatment. Winter conditions often favour moss because grass growth is naturally slower and lawns remain wetter for longer. This treatment is intended to suppress moss activity and help prepare the lawn for stronger recovery when growth resumes.",
      mowingAdvice:
        "Allow the treatment to dry before mowing. Mow only when ground conditions are suitable and avoid cutting the lawn too short during winter.",
      wateringAdvice:
        "No additional watering is normally required. Winter rainfall and naturally damp conditions are usually sufficient.",
      safetyAdvice:
        "Please keep children and pets off the treated lawn until it is fully dry. Take care on wet or slippery lawn surfaces during winter.",
    },

    scarification: {
      title: "Scarification",
      description:
        "Today the lawn was scarified to remove accumulated thatch, dead material and moss from around the base of the grass plants. Scarification can look quite severe immediately afterwards, but opening the turf in this way improves air movement and creates better conditions for healthy grass recovery.",
      mowingAdvice:
        "Do not mow immediately after scarification. Allow the lawn to recover and begin growing again before the next cut, then mow with a sharp blade and avoid cutting too short.",
      wateringAdvice:
        "Keep the lawn adequately moist while it recovers, especially during dry weather. If overseeding has also been carried out, regular light watering is particularly important during germination.",
      safetyAdvice:
        "The surface may be loose, uneven or contain exposed debris immediately after scarification. Minimise unnecessary traffic until the lawn has settled.",
    },

    aeration: {
      title: "Lawn Aeration",
      description:
        "Today the lawn was aerated to relieve soil compaction and improve the movement of air, water and nutrients into the root zone. Aeration encourages healthier rooting and can improve drainage and the lawn's ability to cope with wear and dry conditions.",
      mowingAdvice:
        "Normal mowing can usually resume once the surface is suitable. If soil cores are visible, allow them to dry and naturally break down rather than trying to remove every core.",
      wateringAdvice:
        "Watering after aeration can be beneficial during dry periods because the newly created channels help moisture penetrate deeper into the soil.",
      safetyAdvice:
        "The lawn may be temporarily uneven immediately after aeration. Take extra care until the surface has settled.",
    },

    overseeding: {
      title: "Lawn Overseeding",
      description:
        "Today we overseeded the lawn to introduce fresh grass seed into thin, worn or damaged areas. Successful establishment will improve turf density and help the lawn become more resilient, but germination and early growth depend heavily on moisture and suitable temperatures.",
      mowingAdvice:
        "Avoid mowing until the new grass is established and tall enough to cut safely. When mowing resumes, use a sharp blade, mow on a higher setting and remove only a small amount of growth at first.",
      wateringAdvice:
        "Keep the seeded surface consistently moist during germination. Light, frequent watering is usually best at first; do not allow the seedbed to dry out. Reduce watering frequency gradually once the new grass becomes established.",
      safetyAdvice:
        "Minimise foot traffic, pets and other activity over newly seeded areas until the young grass is established.",
    },

    fallback: {
      title: "Lawn Treatment",
      description:
        "Today we completed the planned lawn-care treatment as part of your annual programme. The treatment has been selected to support the condition, appearance and seasonal needs of your lawn.",
      mowingAdvice:
        "Resume mowing when the lawn is dry and suitable to cut, unless your technician has given treatment-specific advice. Regular mowing with a sharp blade will help maintain healthy turf.",
      wateringAdvice:
        "Follow any treatment-specific watering advice left by your technician and adjust watering according to rainfall, temperature and the condition of the lawn.",
      safetyAdvice:
        "Please keep children and pets off treated areas until any applied treatment is fully dry.",
    },
  };

/*
 * These are the previous built-in defaults.
 *
 * When GreenFlow is upgraded, fields that still exactly match one
 * of these old defaults can safely receive the improved wording
 * above. Any wording the user has genuinely edited or imported is
 * preserved.
 */
const legacyDefaultTreatmentDocumentWording:
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
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[-_/]+/g, " ")
      .replace(/\s+/g, " ");

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
    (
      name.includes("seed") &&
      !name.includes("weed")
    )
  ) {
    return "overseeding";
  }

  const isMossTreatment =
    name.includes("moss");

  if (
    isMossTreatment &&
    name.includes("early") &&
    name.includes("winter")
  ) {
    return "earlyWinterMossControl";
  }

  const weedOrFeed =
    name.includes("weed") ||
    name.includes("feed") ||
    name.includes("fertilis") ||
    name.includes("fertiliz");

  if (
    name.includes("spring") &&
    weedOrFeed
  ) {
    return "springWeedAndFeed";
  }

  if (
    name.includes("summer") &&
    weedOrFeed
  ) {
    return "summerWeedAndFeed";
  }

  if (
    name.includes("autumn") &&
    weedOrFeed
  ) {
    return "autumnWeedAndFeed";
  }

  if (
    isMossTreatment &&
    (
      name.includes("winter") ||
      name.includes("moss treatment") ||
      name.includes("moss control")
    )
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

  const fields: Array<
    keyof TreatmentDocumentWording
  > = [
    "title",
    "description",
    "mowingAdvice",
    "wateringAdvice",
    "safetyAdvice",
  ];

  for (
    const key of Object.keys(
      defaults,
    ) as TreatmentDocumentWordingKey[]
  ) {
    const saved =
      parsed[key];

    if (!saved) {
      continue;
    }

    const legacy =
      legacyDefaultTreatmentDocumentWording[
        key
      ];

    const upgraded = {
      ...defaults[key],
    };

    for (
      const field of fields
    ) {
      const savedValue =
        saved[field];

      if (
        typeof savedValue !==
          "string" ||
        !savedValue.trim()
      ) {
        continue;
      }

      /*
       * Preserve real user/imported wording.
       * Only replace values that are still exactly
       * equal to the old built-in wording.
       */
      if (
        savedValue !==
        legacy[field]
      ) {
        upgraded[field] =
          savedValue;
      }
    }

    defaults[key] =
      upgraded;
  }

  return defaults;
}