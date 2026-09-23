import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLI_MATRIX_CASES } from '../../../support/production-cli-matrix-result.mjs';
import { runProductionCliMatrixCase } from '../../../support/production-cli-matrix-runner.mjs';

// The operator creates this local synthetic admission after a fresh guard List
// and selected-container identity check. Missing admission is an explicit local
// service skip, never a passing database/CLI proof.
const admissionFile = process.env.STORY_2215_CLI_MATRIX_ADMISSION;

describe
  .skipIf(!admissionFile)
  .sequential('guard-owned pinned CLI transaction/history matrix', () => {
    for (const caseName of Object.keys(CLI_MATRIX_CASES)) {
      it(
        caseName,
        async () => {
          const admission = JSON.parse(readFileSync(admissionFile!, 'utf8'));
          const destination = path.join(admission.outputDirectory, caseName);
          const receipt = await runProductionCliMatrixCase({
            caseName,
            destination,
            sourceOptions: admission.sourceOptions,
            guardBinding: admission.guardBinding,
            cli: admission.cli,
            psql: admission.psql,
          });
          writeFileSync(
            path.join(admission.outputDirectory, `${caseName}.json`),
            JSON.stringify(receipt, null, 2) + '\n',
            { flag: 'wx' }
          );
          const accepted =
            caseName === 'postcleanup_success'
              ? ['proven_complete_local_rehearsal']
              : caseName === 'explicit_history_write_failure'
                ? ['committed_unrecorded_current']
                : caseName === 'implicit_history_write_failure'
                  ? [
                      'rolled_back_unrecorded_current',
                      'committed_unrecorded_current',
                    ]
                  : caseName === 'explicit_history_write_timeout'
                    ? ['uncertain_current_file']
                    : ['proven_rejected_before_current_effect'];
          // A setup failure alone is never an acceptable timeout observation.
          expect(receipt.failure).toBeUndefined();
          expect(accepted).toContain(receipt.classification);
          expect(receipt.after).toBeDefined();
          expect(receipt.hostedAccess).toBe(false);
          expect(receipt.productionAdmission).toBe(false);
          if (caseName === 'explicit_history_write_timeout') {
            expect(receipt.attempts.at(-1)?.child.kind).toBe('timeout');
            expect(receipt.hookAfter?.observed).toBe(true);
          }
        },
        120000
      );
    }
  });
