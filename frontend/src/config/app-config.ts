import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Spartan Trading Academy",
  version: packageJson.version,
  copyright: `© ${currentYear}, Spartan Trading Academy. All rights reserved.`,
  meta: {
    title: "Spartan Trading Academy",
    description:
      "Spartan Trading Academy — Premium trading courses, TradingView indicators, and automated bot alerts.",
  },
};
