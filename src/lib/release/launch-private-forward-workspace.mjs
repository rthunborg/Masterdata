// Retired preparation entry points. A protected bootstrap must hold executable
// identity across launch before private workspace preparation can be offered.
// Do not read caller options, import a runtime, or start any process here.
/** @type {(...untrustedOptions: unknown[]) => Promise<never>} */
const unavailable = async () => {
  throw new Error('Private forward workspace is unavailable until a protected bootstrap is reviewed');
};

export const preparePrivateForwardWorkspace = unavailable;
export const verifyPrivateForwardWorkspace = unavailable;
