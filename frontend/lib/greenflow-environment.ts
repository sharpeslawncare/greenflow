export type GreenFlowEnvironment =
  | "development"
  | "test"
  | "production";

const ALLOWED_ENVIRONMENTS =
  new Set<GreenFlowEnvironment>([
    "development",
    "test",
    "production",
  ]);

function readGreenFlowEnvironment():
  GreenFlowEnvironment {
  const value =
    process.env.GREENFLOW_ENVIRONMENT
      ?.trim()
      .toLowerCase();

  if (!value) {
    throw new Error(
      "GREENFLOW_ENVIRONMENT is not configured. " +
        "Set it explicitly to development, test, or production.",
    );
  }

  if (
    !ALLOWED_ENVIRONMENTS.has(
      value as GreenFlowEnvironment,
    )
  ) {
    throw new Error(
      `Invalid GREENFLOW_ENVIRONMENT "${value}". ` +
        "Expected development, test, or production.",
    );
  }

  return value as GreenFlowEnvironment;
}

export const greenFlowEnvironment =
  readGreenFlowEnvironment();

export const isDevelopmentEnvironment =
  greenFlowEnvironment === "development";

export const isTestEnvironment =
  greenFlowEnvironment === "test";

export const isProductionEnvironment =
  greenFlowEnvironment === "production";