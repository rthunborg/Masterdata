import { createHash } from 'node:crypto';
const fail = () => { throw new Error('Production isolation live run refused'); };
const now = () => new Date();
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value !== null && typeof value === 'object' ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value)), 'utf8').digest('hex');
const binding = context => ({ sourceSha: context.sourceSha, sourceTree: context.sourceTree,
  sourceManifestSha256: context.sourceManifestSha256, targetBindingSha256: context.targetBindingSha256 });
const bound = (context, kind, capturedAtUtc, values) => ({ schemaVersion: 1, kind,
  sourceSha: context.sourceSha, targetBindingSha256: context.targetBindingSha256,
  isolationPlanSha256: context.isolationPlanSha256, capturedAtUtc, ...values });

/**
 * Called only after the installed host signature/package/source/tool admission.
 * It returns control observations, never a cleanup, migration, repair or release authority.
 * There is no caller-selected SQL or Management endpoint.
 */
export async function runFixedProductionIsolationLive({ request, modules, sealPriorState } = {}) {
  if (!request || !modules || typeof sealPriorState !== 'function') fail();
  const { controls, probes, liveAdapter, database, platform } = modules;
  const runtime = request.runtime;
  const context = probes.validateProductionIsolationProbeContext(runtime.probeContext);
  const controlContext = { sourceSha: context.sourceSha, targetBindingSha256: context.targetBindingSha256,
    isolationPlanSha256: context.isolationPlanSha256, projectRef: request.environment.EXPECTED_SUPABASE_PROJECT_REF };
  const apiBaseUrl = 'https://' + controlContext.projectRef + '.supabase.co/';
  const previousEnvironment = new Map();
  const installEnvironment = (name, value) => {
    previousEnvironment.set(name, Object.hasOwn(process.env, name) ? process.env[name] : undefined);
    process.env[name] = value;
  };
  for (const [key, value] of Object.entries(request.environment)) installEnvironment(key, value);
  installEnvironment('PSQL_EXECUTABLE', runtime.psqlTool.psqlExecutable);
  installEnvironment('EXPECTED_PSQL_SHA256', runtime.psqlTool.expectedPsqlSha256);
  installEnvironment('EXPECTED_PSQL_VERSION', runtime.psqlTool.expectedPsqlVersion);
  let session = null; let realtimePriorState = null; let platformReadback = null;
  let established = null; let prerequisite = null; let realtimeDisabledSha = null;
  const poolerProbes = []; const networkReadbacks = [];
  try {
    const queryOptions = { workspace: request.workspace, binding: binding(context),
      sourceOptions: runtime.sourceOptions, environment: process.env };
    // All credentials/tool/target/TLS/read-only admission is proved before disabling controls.
    const priorPooler = await probes.probeProductionSessionPoolerReadOnly({
      context, workspace: request.workspace, environment: process.env });
    if (priorPooler.outcome !== 'succeeded' || priorPooler.freshReadOnlyTransactionConfirmed !== true) fail();
    poolerProbes.push(priorPooler);
    const triggers = await database.collectProductionIsolationStatementTriggers(queryOptions);
    const bundle = liveAdapter.createFixedProductionIsolationLiveAdapters({
      projectRef: controlContext.projectRef,
      hostCapability: {
        managementApiToken: runtime.managementApiToken, fetchImpl: fetch, clock: now,
        sealPriorState,
        establishRealtimeSubscription: async ({ priorRealtimeConfig, priorStateCapturedAtUtc }) => {
          const redacted = platform.redactProductionPlatformConfig('realtime', priorRealtimeConfig);
          realtimePriorState = probes.bindProductionRealtimePriorState({ context, capturedAtUtc: priorStateCapturedAtUtc,
            platformConfig: { collectionSucceeded: true, targetBindingSha256: context.targetBindingSha256,
              configurations: { realtime: redacted } } });
          session = probes.createProductionRealtimeProbeSession({
            context, projectUrl: apiBaseUrl, anonKey: runtime.anonymousKey });
          established = await session.establishBeforeControl();
          return established;
        },
        collectPlatformIsolationReadback: async () => {
          platformReadback = await probes.collectProductionPlatformIsolationReadback({ context,
            projectRef: controlContext.projectRef, token: runtime.managementApiToken,
            workspace: request.workspace, environment: process.env });
          return platformReadback;
        },
        dataApiPrerequisite: async () => {
          prerequisite = await probes.collectProductionDataApiWriteProbePrerequisite({ context,
            apiBaseUrl, serviceRoleKey: runtime.serviceRoleKey, statementTriggerInventory: triggers.summary });
          return { authenticatedReadAdmissionPassed: prerequisite.authenticatedReadAdmissionPassed,
            relationExists: prerequisite.relationExists, statementTriggerInventoryComplete: prerequisite.statementTriggerInventoryComplete,
            enabledStatementTriggerCount: prerequisite.enabledStatementTriggerCount };
        },
        probeExcludedOperatorPooler: async () => {
          const observed = await probes.probeProductionSessionPoolerReadOnly({ context,
            workspace: request.workspace, environment: process.env });
          poolerProbes.push(observed);
          if (observed.outcome !== 'denied_network_restriction') fail();
          return { denied: true, denialCause: 'network-restriction' };
        },
        probeOperatorPooler: async () => {
          const observed = await probes.probeProductionSessionPoolerReadOnly({ context,
            workspace: request.workspace, environment: process.env });
          poolerProbes.push(observed);
          if (observed.outcome !== 'succeeded' || observed.freshReadOnlyTransactionConfirmed !== true) fail();
          return { succeeded: true, readOnlyTransactionConfirmed: true };
        },
      },
    });
    const adapters = { ...bundle.adapters };
    adapters.managementRequest = async argument => {
      const response = await bundle.adapters.managementRequest(argument);
      if (argument.method === 'GET' && argument.path === 'config/realtime') {
        realtimeDisabledSha = digest(platform.redactProductionPlatformConfig('realtime', response.body));
      }
      return response;
    };
    adapters.readNetworkRestrictions = async argument => {
      const response = await bundle.adapters.readNetworkRestrictions(argument);
      networkReadbacks.push({ capturedAtUtc: now().toISOString(), appliedConfigurationSha256: digest(response),
        restrictionStatus: response.status, ipv4AllowlistCount: response.dbAllowedCidrs.length,
        ipv6AllowlistCount: response.dbAllowedCidrsV6.length });
      return response;
    };
    const controlReceipt = await controls.runProductionTemporaryIsolationControls({
      context: controlContext, admission: runtime.controlAdmission, adapters });
    const journal = bundle.getControlJournal();
    const dataApiControl = bound(context, 'production-data-api-disable-management-observation',
      controlReceipt.dataApi.capturedAtUtc, { managementApiControlObserved: true, dbSchema: '',
        otherPostgrestSettingsPreserved: true, dataApiDisabled: true });
    const dataApiDenial = await probes.collectProductionDataApiDenialProbe({
      context, apiBaseUrl, serviceRoleKey: runtime.serviceRoleKey, prerequisite, dataApiControl });
    const disconnected = await session.waitForServiceDisconnect({
      controlStartedAtUtc: journal.realtime.configDisableRequestedAtUtc });
    const handshake = await probes.probeProductionRealtimeDisabledHandshake({
      context, projectUrl: apiBaseUrl, anonKey: runtime.anonymousKey });
    const realtimeShutdownQuiescence = probes.bindProductionRealtimeShutdownQuiescenceObservation({
      context, priorState: realtimePriorState, platformReadback,
      shutdownControl: { schemaVersion: 1, kind: 'production-realtime-shutdown-control-observation',
        sourceSha: context.sourceSha, targetBindingSha256: context.targetBindingSha256,
        isolationPlanSha256: context.isolationPlanSha256,
        configDisableRequestedAtUtc: journal.realtime.configDisableRequestedAtUtc,
        configDisableResponseAtUtc: journal.realtime.configDisableResponseAtUtc,
        configDisableHttpStatus: 204, configDisabledReadbackAtUtc: journal.realtime.configDisabledReadbackAtUtc,
        configDisabledReadbackServiceEnabled: false, configDisabledReadbackSha256: realtimeDisabledSha,
        shutdownRequestedAtUtc: journal.realtime.shutdownRequestedAtUtc,
        shutdownResponseAtUtc: journal.realtime.shutdownResponseAtUtc, shutdownHttpStatus: 204 },
      existingConnection: { ...established, ...disconnected },
      reconnectHandshake: handshake, capturedAtUtc: now().toISOString(),
    });
    const databaseDrainAggregate = await database.collectProductionIsolationDatabaseDrain(queryOptions);
    // These are raw approved aggregates, not a completed strict isolation decision.
    // Post-cleanup writer correlation/independent final drain and pause/egress proofs remain separate.
    return Object.freeze({ controlEvidenceOnly: true, controls: controlReceipt, journal,
      observations: { dataApiPrerequisite: prerequisite, dataApiControl, dataApiDenial,
        platformReadback, realtimePriorState, realtimeShutdownQuiescence,
        poolerProbes, networkReadbacks, databaseDrainAggregate } });
  } catch { fail(); }
  finally {
    if (session) { try { await session.close(); } catch { /* No control restoration or reopening. */ } }
    for (const [key, value] of previousEnvironment) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}