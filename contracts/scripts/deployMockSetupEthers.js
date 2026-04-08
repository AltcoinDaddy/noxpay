console.warn(
  "deployMockSetupEthers.js is deprecated and now forwards to the real Nox wrapper deployment flow.\n"
);

await import("./deployRealSetupEthers.js");
