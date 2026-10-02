import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = process.cwd();
const release = path.join(root, 'src/lib/release');
const windowsPowerShell = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');

describe('protected production isolation native boundary', () => {
  it('keeps the public PowerShell wrapper selector-free and delegates before the legacy stub', () => {
    const wrapper = readFileSync(path.join(release, 'production-isolation-host.ps1'), 'utf8');
    const host = readFileSync(path.join(release, 'protected-production-isolation-host.cs'), 'utf8');
    const core = readFileSync(path.join(release, 'protected-production-isolation-core.cs'), 'utf8');
    expect(wrapper).toMatch(/^param\(\)/mu);
    expect(wrapper).toContain("[IO.Path]::Combine($PSScriptRoot,'production-isolation.exe')");
    expect(wrapper).not.toContain('InstalledRoot');
    expect(host).toContain('return ProtectedProductionIsolationCore.Run(args);');
    expect(host).not.toContain('LegacyMain');
    expect(core).toContain('Require(args.Length == 0)');
    expect(core).toContain('JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE');
    expect(core).toContain('ReadBoundedLineAsync');
    expect(core).toContain('DrainStderrBoundedAsync');
    expect(core).toContain('WriteBoundedLineAsync');
    expect(core).toContain('EXPECTED_SUPABASE_TARGET_BINDING_SHA256');
    expect(core).toContain('expectedPsqlVersion');
    expect(core).toContain('SealIsolationPriorState(contextJson, priorJson)');
    expect(core).toContain('protected-production-isolation-prior-state-seal');
    expect(core).toContain('parsed, schema-checked, redacted evidence only');
    expect(core).not.toMatch(/https?:\/\//iu);
  });
});

describe.skipIf(process.platform !== 'win32')('protected production isolation host compilation', () => {
  it('compiles the actual selector-free entry and bounded core with an explicit generated Installation contract', () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'hr-isolation-host-compile-'));
    try {
      const sha40 = 'a'.repeat(40), sha256 = 'b'.repeat(64), plan = 'c'.repeat(64);
      const stamp = (milliseconds: number) => new Date(Date.UTC(2026, 9, 2, 12, 0, 0, milliseconds)).toISOString();
      const at = stamp(0);
      const receipt = {
        kind: 'protected-production-isolation-complete', controlEvidenceOnly: true,
        controls: { schemaVersion: 1, sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at,
          kind: 'production-temporary-isolation-controls', controlEvidenceOnly: true,
          priorState: { schemaVersion: 1, kind: 'production-isolation-prior-state-sealed', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, encrypted: true, immutable: true, ciphertextSha256: sha256 },
          dataApi: { capturedAtUtc: at, prerequisiteAccepted: true, dbSchemaDisabled: true, otherPostgrestSettingsPreserved: true },
          realtime: { capturedAtUtc: at, suspended: true, shutdownAcknowledged: true },
          network: { capturedAtUtc: at, exclusionApplied: true, exclusionReadbackAccepted: true, exclusionDenialProved: true, operatorOnlyApplied: true, operatorReadbackAccepted: true, operatorReadOnlyAdmissionProved: true } },
        journal: { schemaVersion: 1, kind: 'production-isolation-live-adapter-control-journal', requests: [{ method: 'GET', path: 'config/auth', requestedAtUtc: at, responseAtUtc: at }], realtime: { existingSessionEstablished: true, configDisableRequestedAtUtc: at, configDisableResponseAtUtc: at, configDisabledReadbackAtUtc: at, independentPlatformReadbackCompleted: true, shutdownRequestedAtUtc: at, shutdownResponseAtUtc: at } },
        observations: { dataApiPrerequisite: { schemaVersion: 1, kind: 'production-data-api-write-probe-prerequisite', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, schema: 'public', relation: 'employees', credentialRole: 'service_role', credentialPreflightPassed: true, authenticatedReadAdmissionPassed: true, relationExists: true, statementTriggerInventoryComplete: true, enabledStatementTriggerCount: 0 },
          dataApiControl: { schemaVersion: 1, kind: 'production-data-api-disable-management-observation', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, managementApiControlObserved: true, dbSchema: '', otherPostgrestSettingsPreserved: true, dataApiDisabled: true },
          dataApiDenial: { schemaVersion: 1, kind: 'production-data-api-denial-probe', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, independentFromControlObservation: true, authenticatedWritePathAttempted: true, denialCause: 'data-api-disabled', requestDenied: true, writeCommitted: false, requestMethod: 'POST', relation: 'employees', contentProfile: 'public', requestContentType: 'application/json', requestBody: '[]', httpStatus: 406, providerErrorCode: 'PGRST106' },
          platformReadback: { schemaVersion: 1, kind: 'production-platform-isolation-observation', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, authHookEnabled: { hook_custom_access_token_enabled: false, hook_mfa_verification_attempt_enabled: false, hook_password_verification_attempt_enabled: false, hook_send_sms_enabled: false, hook_send_email_enabled: false, hook_before_user_created_enabled: false, hook_after_user_created_enabled: false }, unknownAuthHookCount: 0, realtimeSuspended: true },
          realtimePriorState: { schemaVersion: 1, kind: 'production-realtime-prior-state-observation', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, serviceEnabled: true, configSha256: sha256 },
          realtimeShutdownQuiescence: { schemaVersion: 1, kind: 'production-realtime-shutdown-quiescence-observation', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, independentFromControlObservation: true, controlMethod: 'supabase-management-api-realtime-disable-and-shutdown', priorRealtimeServiceEnabled: true, configDisableRequestedAtUtc: at, configDisableResponseAtUtc: at, configDisableHttpStatus: 204, configDisabledReadbackAtUtc: at, configDisabledReadbackServiceEnabled: false, configDisabledReadbackSha256: sha256, shutdownRequestedAtUtc: at, shutdownResponseAtUtc: at, shutdownHttpStatus: 204, existingConnectionEstablishedBeforeIsolation: true, existingSubscriptionAcknowledgedBeforeIsolation: true, existingConnectionDisconnectedByService: true, existingConnectionClosedByCaller: false, existingConnectionEstablishedAtUtc: at, existingSubscriptionAcknowledgedAtUtc: at, existingConnectionDisconnectedAtUtc: at, reconnectAttemptedAtUtc: at, reconnectDeniedAtUtc: at, connectionAttempted: true, connectionDenied: true, writeObserved: false, httpStatus: 403, providerErrorCode: 'RealtimeDisabledForTenant', denialCause: 'realtime-disabled-for-tenant' },
          poolerProbes: [{ schemaVersion: 1, kind: 'production-session-pooler-readonly-probe', sourceSha: sha40, targetBindingSha256: sha256, isolationPlanSha256: plan, capturedAtUtc: at, outcome: 'succeeded', freshReadOnlyTransactionConfirmed: true }],
          networkReadbacks: [{ capturedAtUtc: at, appliedConfigurationSha256: sha256, restrictionStatus: 'applied', ipv4AllowlistCount: 1, ipv6AllowlistCount: 0 }],
          databaseDrainAggregate: { collectionStartedAtUtc: at, capturedAtUtc: at, summary: { allApplicableSessionsObserved: true, applicableApplicationSessionCount: 0, inflightWriteCount: 0, preparedApplicationWriteCount: 0, existingApplicationSessionCount: 0, replicationSlotInventoryComplete: true, activeReplicationSlotCount: 0, subscriptionInventoryComplete: true, enabledSubscriptionCount: 0 } } },
      };
      const request = (method: string, path: string, milliseconds: number) => ({
        method, path, requestedAtUtc: stamp(milliseconds), responseAtUtc: stamp(milliseconds + 1),
      });
      const fixedMethods = ['GET', 'GET', 'GET', 'GET', 'PATCH', 'GET', 'PATCH', 'GET', 'POST'];
      const fixedPaths = ['config/auth', 'config/realtime', 'postgrest', 'network-restrictions', 'postgrest', 'postgrest', 'config/realtime', 'config/realtime', 'config/realtime/shutdown'];
      const firstApplyAt = 1_000;
      const firstPolls = [1_100, 1_200, 1_300];
      const secondApplyAt = 1_400;
      const secondPolls = [1_500, 1_600];
      receipt.journal.requests = [
        ...fixedMethods.map((method, index) => request(method, fixedPaths[index], 100 + index * 100)),
        request('POST', 'network-restrictions/apply', firstApplyAt),
        ...firstPolls.map(milliseconds => request('GET', 'network-restrictions', milliseconds)),
        request('POST', 'network-restrictions/apply', secondApplyAt),
        ...secondPolls.map(milliseconds => request('GET', 'network-restrictions', milliseconds)),
      ];
      receipt.journal.realtime = {
        existingSessionEstablished: true,
        configDisableRequestedAtUtc: stamp(700), configDisableResponseAtUtc: stamp(701),
        configDisabledReadbackAtUtc: stamp(801), independentPlatformReadbackCompleted: true,
        shutdownRequestedAtUtc: stamp(900), shutdownResponseAtUtc: stamp(901),
      };
      Object.assign(receipt.observations.realtimeShutdownQuiescence, {
        configDisableRequestedAtUtc: stamp(700), configDisableResponseAtUtc: stamp(701),
        configDisabledReadbackAtUtc: stamp(801), shutdownRequestedAtUtc: stamp(900), shutdownResponseAtUtc: stamp(901),
      });
      receipt.controls.capturedAtUtc = stamp(1_700);
      receipt.controls.network.capturedAtUtc = stamp(1_700);
      const priorPooler = { ...receipt.observations.poolerProbes[0], capturedAtUtc: stamp(50) };
      receipt.observations.poolerProbes = [
        priorPooler,
        { ...priorPooler, capturedAtUtc: stamp(1_350), outcome: 'denied_network_restriction', freshReadOnlyTransactionConfirmed: false },
        { ...priorPooler, capturedAtUtc: stamp(1_650) },
      ];
      const readback = (milliseconds: number, hash: string, restrictionStatus: string, requestedConfigurationMatched: boolean, previousConfigurationMatched: boolean, ipv4AllowlistCount: number, ipv6AllowlistCount: number) => ({
        capturedAtUtc: stamp(milliseconds + 2), appliedConfigurationSha256: hash, restrictionStatus,
        requestedConfigurationMatched, previousConfigurationMatched, ipv4AllowlistCount, ipv6AllowlistCount,
      });
      receipt.observations.networkReadbacks = [
        readback(firstPolls[0], 'd'.repeat(64), 'stored', true, false, 1, 0),
        // A prior policy can legitimately have broad/multiple IPv4 and IPv6 entries
        // while provider propagation is still returning the stale applied profile.
        readback(firstPolls[1], 'e'.repeat(64), 'applied', false, true, 2, 1),
        readback(firstPolls[2], 'f'.repeat(64), 'applied', true, false, 1, 0),
        readback(secondPolls[0], '1'.repeat(64), 'stored', true, false, 1, 0),
        readback(secondPolls[1], '2'.repeat(64), 'applied', true, false, 1, 0),
      ];
      // Preserve the original fast path: a single settled readback for each
      // non-retried POST remains a valid bounded receipt.
      const immediateApplied = JSON.parse(JSON.stringify(receipt)) as typeof receipt;
      immediateApplied.journal.requests = [
        ...fixedMethods.map((method, index) => request(method, fixedPaths[index], 100 + index * 100)),
        request('POST', 'network-restrictions/apply', 1_000),
        request('GET', 'network-restrictions', 1_100),
        request('POST', 'network-restrictions/apply', 1_200),
        request('GET', 'network-restrictions', 1_300),
      ];
      immediateApplied.observations.networkReadbacks = [
        readback(1_100, '3'.repeat(64), 'applied', true, false, 1, 0),
        readback(1_300, '4'.repeat(64), 'applied', true, false, 1, 0),
      ];
      immediateApplied.observations.poolerProbes[1].capturedAtUtc = stamp(1_150);
      immediateApplied.observations.poolerProbes[2].capturedAtUtc = stamp(1_350);
      immediateApplied.controls.capturedAtUtc = stamp(1_400);
      immediateApplied.controls.network.capturedAtUtc = stamp(1_400);

      // Exercise the strict maximum: exactly 20 sequential first-phase GETs,
      // then a separate settled operator phase. The only final profiles are
      // the exact requested 1-v4/0-v6 configurations.
      const exactTwentyPolls = JSON.parse(JSON.stringify(receipt)) as typeof receipt;
      const firstTwentyPolls = Array.from({ length: 20 }, (_, index) => 1_100 + index * 10);
      exactTwentyPolls.journal.requests = [
        ...fixedMethods.map((method, index) => request(method, fixedPaths[index], 100 + index * 100)),
        request('POST', 'network-restrictions/apply', 1_000),
        ...firstTwentyPolls.map(milliseconds => request('GET', 'network-restrictions', milliseconds)),
        request('POST', 'network-restrictions/apply', 1_300),
        request('GET', 'network-restrictions', 1_310),
      ];
      exactTwentyPolls.observations.networkReadbacks = [
        ...firstTwentyPolls.map((milliseconds, index) => readback(milliseconds, index === 19 ? '6'.repeat(64) : '7'.repeat(64),
          index === 19 ? 'applied' : 'stored', true, false, 1, 0)),
        readback(1_310, '5'.repeat(64), 'applied', true, false, 1, 0),
      ];
      exactTwentyPolls.observations.poolerProbes[1].capturedAtUtc = stamp(1_295);
      exactTwentyPolls.observations.poolerProbes[2].capturedAtUtc = stamp(1_320);
      exactTwentyPolls.controls.capturedAtUtc = stamp(1_330);
      exactTwentyPolls.controls.network.capturedAtUtc = stamp(1_330);
      const negatives: { id: string; valueJson: string }[] = [];
      function altered(id: string, location: string, value: unknown, remove = false) {
        const variant = JSON.parse(JSON.stringify(receipt)) as Record<string, unknown>;
        const steps = location.split('.'); let parent = variant;
        for (const step of steps.slice(0, -1)) parent = parent[step] as Record<string, unknown>;
        if (remove) delete parent[steps.at(-1)!]; else parent[steps.at(-1)!] = value;
        negatives.push({ id, valueJson: JSON.stringify(variant) });
      }
      const nested = ['controls.priorState', 'controls.dataApi', 'controls.realtime', 'controls.network',
        'journal.requests', 'journal.realtime', ...Object.keys(receipt.observations).map(key => 'observations.' + key),
        'observations.platformReadback.authHookEnabled', 'observations.databaseDrainAggregate.summary'];
      for (const location of nested) {
        altered(location + ':null', location, null);
        altered(location + ':missing', location, undefined, true);
        altered(location + ':partial', location, {});
      }
      altered('wrong-target', 'observations.dataApiDenial.targetBindingSha256', 'e'.repeat(64));
      altered('wrong-source', 'observations.realtimePriorState.sourceSha', 'e'.repeat(40));
      altered('wrong-plan', 'controls.priorState.isolationPlanSha256', 'e'.repeat(64));
      altered('wrong-provider', 'observations.dataApiDenial.providerErrorCode', 'RealtimeDisabledForTenant');
      altered('wrong-denial', 'observations.dataApiDenial.denialCause', 'network-restriction');
      altered('unsealed', 'controls.priorState.encrypted', false);
      altered('caller-closed', 'observations.realtimeShutdownQuiescence.existingConnectionClosedByCaller', true);
      altered('hook-enabled', 'observations.platformReadback.authHookEnabled.hook_send_email_enabled', true);
      altered('trigger-count-boolean', 'observations.dataApiPrerequisite.enabledStatementTriggerCount', false);
      altered('unknown-receipt-key', 'controls.priorState.secret', 'synthetic-private-value');
      altered('wrong-journal-path', 'journal.requests.7.path', 'config/auth');
      altered('wrong-readback-journal-binding', 'journal.realtime.configDisabledReadbackAtUtc', '2026-10-02T11:59:59.000Z');
      altered('pooler-partial-sequence', 'observations.poolerProbes', [priorPooler]);
      altered('readback-partial-sequence', 'observations.networkReadbacks', [receipt.observations.networkReadbacks[0]]);
      altered('pooler-missing-denial', 'observations.poolerProbes.1.outcome', 'succeeded');
      altered('duplicated-final-network-config', 'observations.networkReadbacks.4.appliedConfigurationSha256', 'f'.repeat(64));
      altered('malformed-network-configuration-hash', 'observations.networkReadbacks.4.appliedConfigurationSha256', 'not-a-sha256');
      altered('stored-previous-only', 'observations.networkReadbacks.0.requestedConfigurationMatched', false);
      altered('stored-requested-broad-ipv4', 'observations.networkReadbacks.0.ipv4AllowlistCount', 2);
      altered('stored-requested-ipv6-present', 'observations.networkReadbacks.0.ipv6AllowlistCount', 1);
      altered('unmatched-intermediate-profile', 'observations.networkReadbacks.1.previousConfigurationMatched', false);
      altered('final-previous-only', 'observations.networkReadbacks.2.requestedConfigurationMatched', false);
      altered('final-not-applied', 'observations.networkReadbacks.4.restrictionStatus', 'stored');
      altered('final-broad-profile', 'observations.networkReadbacks.4.ipv4AllowlistCount', 2);
      altered('network-readback-before-response', 'observations.networkReadbacks.0.capturedAtUtc', stamp(1_100));
      altered('excluded-probe-before-first-final-readback', 'observations.poolerProbes.1.capturedAtUtc', stamp(1_300));
      altered('operator-probe-before-final-readback', 'observations.poolerProbes.2.capturedAtUtc', stamp(1_600));
      const inconsistentRequestedHash = JSON.parse(JSON.stringify(exactTwentyPolls)) as typeof receipt;
      inconsistentRequestedHash.observations.networkReadbacks[1].appliedConfigurationSha256 = '8'.repeat(64);
      negatives.push({ id: 'same-phase-requested-hash-mismatch', valueJson: JSON.stringify(inconsistentRequestedHash) });
      const tooManyPolls = JSON.parse(JSON.stringify(receipt)) as typeof receipt;
      const secondPostIndex = tooManyPolls.journal.requests.findIndex((entry, index) => index > 9 && entry.method === 'POST');
      const extraPolls = Array.from({ length: 18 }, (_, index) => request('GET', 'network-restrictions', 1_310 + index * 10));
      tooManyPolls.journal.requests.splice(secondPostIndex, 0, ...extraPolls);
      tooManyPolls.observations.networkReadbacks.splice(3, 0, ...extraPolls.map((entry, index) => ({
        capturedAtUtc: stamp(1_312 + index * 10), appliedConfigurationSha256: String(index % 9).repeat(64),
        restrictionStatus: index === 17 ? 'applied' : 'stored', requestedConfigurationMatched: true, previousConfigurationMatched: false,
        ipv4AllowlistCount: 1, ipv6AllowlistCount: 0,
      })));
      tooManyPolls.observations.networkReadbacks[2].restrictionStatus = 'stored';
      tooManyPolls.journal.requests[secondPostIndex + extraPolls.length] = request('POST', 'network-restrictions/apply', 1_600);
      tooManyPolls.journal.requests[secondPostIndex + extraPolls.length + 1] = request('GET', 'network-restrictions', 1_700);
      tooManyPolls.journal.requests[secondPostIndex + extraPolls.length + 2] = request('GET', 'network-restrictions', 1_800);
      tooManyPolls.observations.networkReadbacks[21].capturedAtUtc = stamp(1_702);
      tooManyPolls.observations.networkReadbacks[22].capturedAtUtc = stamp(1_802);
      tooManyPolls.observations.poolerProbes[1].capturedAtUtc = stamp(1_500);
      tooManyPolls.observations.poolerProbes[2].capturedAtUtc = stamp(1_850);
      tooManyPolls.controls.network.capturedAtUtc = stamp(1_900);
      negatives.push({ id: 'first-poll-phase-over-20', valueJson: JSON.stringify(tooManyPolls) });
      const reorderedPoll = JSON.parse(JSON.stringify(receipt)) as typeof receipt;
      [reorderedPoll.journal.requests[10], reorderedPoll.journal.requests[11]] = [reorderedPoll.journal.requests[11], reorderedPoll.journal.requests[10]];
      negatives.push({ id: 'poll-order', valueJson: JSON.stringify(reorderedPoll) });
      writeFileSync(path.join(fixture, 'negative-receipts.json'), JSON.stringify(negatives));
      writeFileSync(path.join(fixture, 'negative-count.txt'), String(negatives.length));
      const expectedNegativeCases = negatives.length;

      writeFileSync(path.join(fixture, 'positive-receipts.json'), JSON.stringify([
        receipt, immediateApplied, exactTwentyPolls,
      ]));
      writeFileSync(path.join(fixture, 'receipt.json'), JSON.stringify(receipt));
      for (const name of ['protected-file-lease.cs', 'protected-production-inputs.cs', 'production-isolation-private-runtime.cs', 'protected-production-isolation-host.cs', 'protected-production-isolation-core.cs']) {
        writeFileSync(path.join(fixture, name), readFileSync(path.join(release, name)));
      }
      writeFileSync(path.join(fixture, 'stubs.cs'), `
using System; using System.Collections.Generic; using System.IO; using System.Text; using System.Threading; using System.Threading.Tasks;
namespace HrMasterdata.Release {
 internal sealed class SlowDripStream : Stream { readonly byte[] data=Encoding.UTF8.GetBytes("abcdef"); int offset; public override bool CanRead{get{return true;}} public override bool CanSeek{get{return false;}} public override bool CanWrite{get{return false;}} public override long Length{get{throw new NotSupportedException();}} public override long Position{get{throw new NotSupportedException();}set{throw new NotSupportedException();}} public override void Flush(){} public override int Read(byte[] buffer,int start,int count){Thread.Sleep(12);if(offset>=data.Length)return 0;buffer[start]=data[offset++];return 1;} public override Task<int> ReadAsync(byte[] buffer,int start,int count,CancellationToken cancellationToken){return Task.Factory.StartNew(()=>Read(buffer,start,count));} public override long Seek(long value,SeekOrigin origin){throw new NotSupportedException();} public override void SetLength(long value){throw new NotSupportedException();} public override void Write(byte[] buffer,int start,int count){throw new NotSupportedException();} }
 internal static class Installation {
  internal const string Root="C:\\\\synthetic"; internal const string CleanSourceRoot="C:\\\\synthetic-source"; internal const string RuntimeRoot="C:\\\\synthetic-runtime"; internal const string PrivilegedRoot="C:\\\\synthetic-private"; internal const string ToolRoot="C:\\\\synthetic-tools"; internal const string InputRoot="C:\\\\synthetic-input"; internal const string ProjectRef="abcdefghijklmnopqrst"; internal const string SourceCommit="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; internal const string TargetBindingSha256="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; internal const string IsolationPlanSha256="cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"; internal const string WorkerSha256="dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"; internal const string LiveAdapterSha256="eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; internal const string NodeExecutable="C:\\\\synthetic-runtime\\\\node.exe"; internal const string OriginPrivateKey="<RSAKeyValue></RSAKeyValue>";
  internal sealed class LeaseGroup { internal string Root; internal IDictionary<string,string> Files; internal LeaseGroup(string root){Root=root;Files=new Dictionary<string,string>();} } internal static readonly Dictionary<string,string> InstallationFiles=new Dictionary<string,string>(); internal static readonly Dictionary<string,string> SourceFiles=new Dictionary<string,string>(); internal static readonly Dictionary<string,string> RuntimeFiles=new Dictionary<string,string>(); internal static readonly Dictionary<string,string> PrivilegedFiles=new Dictionary<string,string>(); internal static readonly LeaseGroup[] ToolGroups=new LeaseGroup[0];
  internal static object ReadIsolationAdmission(){return new {sourceCommit=SourceCommit,sourceTree=SourceCommit,sourceManifestSha256=TargetBindingSha256,approvedPackageSha256=TargetBindingSha256,rawModuleSha256=TargetBindingSha256,toolchainSha256=TargetBindingSha256,targetBindingSha256=TargetBindingSha256,tlsAdmissionSha256=TargetBindingSha256,egressAdmissionSha256=TargetBindingSha256,isolationPlanSha256=IsolationPlanSha256,managementApiCapabilitySha256=TargetBindingSha256};}
  internal static string ReadManagementApiToken(){return "synthetic";} internal static string ReadAnonymousKey(string p){return "synthetic";} internal static string ReadServiceRoleKey(string p){return "synthetic";} internal static object ReadControlAdmission(){return new {kind="synthetic"};} internal static object ReadProbeContext(){return new {kind="synthetic"};} internal static object ReadSourceOptions(){return new {commit=SourceCommit,gitExecutable="C:\\\\synthetic\\\\git.exe",expectedGitSha256=TargetBindingSha256};} internal static object ReadPsqlTool(){return new {psqlExecutable="C:\\\\synthetic\\\\psql.exe",expectedPsqlSha256=TargetBindingSha256,expectedPsqlVersion="16.0"};} internal static object SealIsolationPriorState(string context,string prior){return new {kind="synthetic"};}
 }
}`);
      const script = path.join(fixture, 'compile.ps1');
      writeFileSync(script, `param([string]$Root)
$ErrorActionPreference='Stop';$provider=New-Object Microsoft.CSharp.CSharpCodeProvider;$parameters=New-Object CodeDom.Compiler.CompilerParameters;$parameters.GenerateExecutable=$true;$parameters.OutputAssembly=(Join-Path $Root 'host.exe');$parameters.CompilerOptions='/optimize+ /platform:x64';foreach($assembly in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll','System.Net.Http.dll')){$null=$parameters.ReferencedAssemblies.Add($assembly)};try{$result=$provider.CompileAssemblyFromFile($parameters,[string[]]@((Join-Path $Root 'protected-file-lease.cs'),(Join-Path $Root 'protected-production-inputs.cs'),(Join-Path $Root 'production-isolation-private-runtime.cs'),(Join-Path $Root 'protected-production-isolation-host.cs'),(Join-Path $Root 'protected-production-isolation-core.cs'),(Join-Path $Root 'stubs.cs')));if($result.Errors.HasErrors){throw (($result.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line}) -join ',')};$marker=Join-Path $Root 'private-input-marker';$assembly=[Reflection.Assembly]::LoadFile($parameters.OutputAssembly);$core=$assembly.GetType('HrMasterdata.Release.ProtectedProductionIsolationCore');$run=$core.GetMethods([Reflection.BindingFlags]'NonPublic,Static')|Where-Object {$_.Name -eq 'Run'};$invokeArguments=New-Object 'object[]' 1;$invokeArguments[0]=[string[]]@('--unsupported');$invokeExit=[int]$run.Invoke($null,$invokeArguments);if($invokeExit -eq 0 -or (Test-Path -LiteralPath $marker)){throw ('selector-refusal:'+ $invokeExit + ':' + (Test-Path -LiteralPath $marker))};$read=$core.GetMethods([Reflection.BindingFlags]'NonPublic,Static')|Where-Object {$_.Name -eq 'ReadBoundedLineAsync'};$stream=$assembly.CreateInstance('HrMasterdata.Release.SlowDripStream');$reader=New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8,$false,1);$readArgs=New-Object 'object[]' 3;$readArgs[0]=$reader;$readArgs[1]=[Diagnostics.Stopwatch]::StartNew();$readArgs[2]=30;$slowRefused=$false;$slowClock=[Diagnostics.Stopwatch]::StartNew();try{$null=$read.Invoke($null,$readArgs)}catch{$slowRefused=$true}finally{$reader.Dispose()};if(-not $slowRefused -or $slowClock.ElapsedMilliseconds -gt 400){throw 'slow-drip-timeout'};$method=$core.GetMethods([Reflection.BindingFlags]'NonPublic,Static')|Where-Object {$_.Name -eq 'ValidateFinalForTest'};[string]$receipt=[IO.File]::ReadAllText((Join-Path $Root 'receipt.json'));$valid=[bool]$method.Invoke($null,[object[]]@($receipt));$invalid=$receipt.Replace('"credentialRole":"service_role"','"credentialRole":"service_role:secret"');$rejected=-not [bool]$method.Invoke($null,[object[]]@($invalid));if(-not $valid -or -not $rejected){throw ('privacy-receipt-validation:'+ $valid + ':' + $rejected)};[string]$negativeBytes=[IO.File]::ReadAllText((Join-Path $Root 'negative-receipts.json'));$negativeCases=$negativeBytes|ConvertFrom-Json;$expectedNegativeCount=[int][IO.File]::ReadAllText((Join-Path $Root 'negative-count.txt'));$negativeCount=0;foreach($case in $negativeCases){[string]$negativeJson=$case.valueJson;if([bool]$method.Invoke($null,[object[]]@($negativeJson))){throw ('nested-evidence-accepted:'+$case.id)};$negativeCount++};if($negativeCount -ne $expectedNegativeCount){throw 'negative-case-coverage'};@{compiled=$true;selectorRefused=$true;slowDripRefused=$true;privateInputsLoaded=$false;hostedAccess=$false;approvedEvidenceAccepted=$true;unknownSecretRejected=$true;closedNestedCasesRejected=$negativeCount}|ConvertTo-Json -Compress}finally{$provider.Dispose()}`);
      const result = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, fixture], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({ compiled: true, selectorRefused: true, slowDripRefused: true, privateInputsLoaded: false, hostedAccess: false, approvedEvidenceAccepted: true, unknownSecretRejected: true, closedNestedCasesRejected: expectedNegativeCases });
      expect(existsSync(path.join(fixture, 'host.exe'))).toBe(true);
      const validatePositiveScript = path.join(fixture, 'validate-positive-receipts.ps1');
      writeFileSync(validatePositiveScript, `param([string]$Root)
$ErrorActionPreference='Stop'
$assembly=[Reflection.Assembly]::LoadFile((Join-Path $Root 'host.exe'))
$core=$assembly.GetType('HrMasterdata.Release.ProtectedProductionIsolationCore')
$method=$core.GetMethods([Reflection.BindingFlags]'NonPublic,Static')|Where-Object {$_.Name -eq 'ValidateFinalForTest'}
$receipts=([IO.File]::ReadAllText((Join-Path $Root 'positive-receipts.json'))|ConvertFrom-Json)
if($receipts.Count -ne 3){throw 'positive-case-coverage'}
foreach($receipt in $receipts){[string]$text=$receipt|ConvertTo-Json -Depth 32 -Compress;if(-not [bool]$method.Invoke($null,[object[]]@($text))){throw 'positive-receipt-rejected'}}
@{immediateAppliedAccepted=$true;exactTwentyPollsAccepted=$true;hostedAccess=$false}|ConvertTo-Json -Compress`);
      const positiveResult = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', validatePositiveScript, fixture], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
      expect(positiveResult.error).toBeUndefined();
      expect(positiveResult.status, positiveResult.stderr).toBe(0);
      expect(JSON.parse(positiveResult.stdout.trim())).toEqual({ immediateAppliedAccepted: true, exactTwentyPollsAccepted: true, hostedAccess: false });
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  }, 40_000);

  it('compiles the Installation contract emitted from the installer source without invoking installation', () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'hr-isolation-installer-contract-'));
    try {
      const script = path.join(fixture, 'compile-installer-contract.ps1');
      writeFileSync(script, `param([string]$Project,[string]$Root)
$ErrorActionPreference='Stop'
$fixtureRoot=$Root
$installer=[IO.File]::ReadAllText((Join-Path $Project 'src/lib/release/install-protected-production-isolation.ps1'))
function Slice([string]$start,[string]$end){$from=$installer.IndexOf($start,[StringComparison]::Ordinal);$to=$installer.IndexOf($end,$from,[StringComparison]::Ordinal);if($from -lt 0 -or $to -lt $from){throw 'installer-source'};return $installer.Substring($from,$to-$from)}
$literal=Slice ' function Literal' ' function Rows';$rows=Slice ' function Rows' ' function Constant';$constant=Slice ' function Constant' '$plan=''using System';$readCode=Slice ' function Read-Code' '$plan+=''internal static object ReadIsolationAdmission'
$planSection=Slice '$plan=''using System' '$stage=''compile'''
$sha='b'*64;$commit='a'*40;$packageFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]';$packageFiles.Add('src/lib/release/production-isolation-live-adapter.mjs',$sha)
$installedFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]';$installedFiles.Add('runtime/node.exe',$sha)
$sourceFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]';$sourceFiles.Add('src/lib/release/protected-production-isolation-worker.mjs',$sha)
$runtimeFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]';$runtimeFiles.Add('node_modules/ws/index.js',$sha)
$privateFiles=New-Object 'System.Collections.Generic.Dictionary[string,string]';$privateFiles.Add('inputs/production-inputs.v1.dpapi',$sha)
$toolGroups=@();$root=[IO.Path]::GetFullPath((Join-Path $Root 'installed'));$sourceRoot=[IO.Path]::GetFullPath((Join-Path $Root 'source'));$privateRoot=[IO.Path]::GetFullPath((Join-Path $Root 'private'));$projectRef='abcdefghijklmnopqrst'
$admission=[pscustomobject]@{targetBindingSha256=$sha;isolationPlanSha256=('c'*64);rawModuleSha256=('d'*64);tlsAdmissionSha256=$sha;egressAdmissionSha256=$sha;managementApiCapabilitySha256=$sha}
$toolchain=[pscustomobject]@{tlsAdmissionPath=(Join-Path $privateRoot 'tls.json');egressAdmissionPath=(Join-Path $privateRoot 'egress.json');managementApiCapabilityPath=(Join-Path $privateRoot 'api.json');runtimeRecordPath=(Join-Path $privateRoot 'runtime.json');runtimeRecordSha256=$sha;git=[pscustomobject]@{executable=(Join-Path $Root 'tools/git.exe');sha256=$sha;version='git version synthetic'};psql=[pscustomobject]@{executable=(Join-Path $Root 'tools/psql.exe');sha256=$sha;version='psql (PostgreSQL) 17.6'}}
$ExpectedIsolationAdmissionSha256=$sha;$ExpectedToolchainSha256=$sha;$privateKey='<RSAKeyValue></RSAKeyValue>'
Invoke-Expression $literal;Invoke-Expression $rows;Invoke-Expression $constant;Invoke-Expression $readCode;Invoke-Expression $planSection
[IO.File]::WriteAllText((Join-Path $fixtureRoot 'generated-installation.cs'),$plan,(New-Object Text.UTF8Encoding($false)))
$provider=New-Object Microsoft.CSharp.CSharpCodeProvider;$parameters=New-Object CodeDom.Compiler.CompilerParameters;$parameters.GenerateExecutable=$true;$parameters.OutputAssembly=(Join-Path $fixtureRoot 'contract.exe');$parameters.CompilerOptions='/optimize+ /platform:x64';foreach($assembly in @('System.dll','System.Core.dll','System.Security.dll','System.Web.Extensions.dll','System.Net.Http.dll')){$null=$parameters.ReferencedAssemblies.Add($assembly)};try{$units=@('protected-file-lease.cs','protected-production-inputs.cs','production-isolation-private-runtime.cs','protected-production-isolation-host.cs','protected-production-isolation-core.cs')|ForEach-Object {Join-Path $Project ('src/lib/release/'+$_)};$units+=(Join-Path $fixtureRoot 'generated-installation.cs');$result=$provider.CompileAssemblyFromFile($parameters,[string[]]$units);if($result.Errors.HasErrors){throw (($result.Errors|ForEach-Object {$_.ErrorNumber+':'+$_.Line}) -join ',')};@{installerContractCompiled=$true;installerExecuted=$false;privateInputsLoaded=$false;hostedAccess=$false}|ConvertTo-Json -Compress}finally{$provider.Dispose()}`);
      const result = spawnSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, root, fixture], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({ installerContractCompiled: true, installerExecuted: false, privateInputsLoaded: false, hostedAccess: false });
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  }, 40_000);
});
