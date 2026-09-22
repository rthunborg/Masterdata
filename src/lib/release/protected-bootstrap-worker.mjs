import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// This entry point has no private-input loader or database operation. The
// installation host supplies its inherited pipe only after acquiring leases.
// The owner and local administrators are trusted; this is not a sandbox against
// that user, nor does a correctly shaped packet grant production authority.
async function main() {
  if (process.argv.length !== 2) throw new Error('runtime');
  const nonce = randomBytes(32).toString('hex');
  process.stdout.write(JSON.stringify({ kind: 'protected-toolchain-ready', nonce }) + '\n');
  let packet = '';
  const timer = setTimeout(() => process.exit(1), 10_000);
  for await (const chunk of process.stdin) {
    packet += chunk.toString('utf8');
    if (Buffer.byteLength(packet) > 1024) throw new Error('packet');
  }
  clearTimeout(timer);
  const request = JSON.parse(packet);
  if (!request || Array.isArray(request) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(['nonce', 'operation', 'schemaVersion']) ||
      request.schemaVersion !== 1 || request.nonce !== nonce || request.operation !== 'verify-toolchain') {
    throw new Error('packet');
  }
  // Absolute URL resolution binds the entry to this leased installation.
  // No import or command name comes from the pipe or the environment.
  const { runReviewedSupabaseCli } = await import('../../../supabase/verify/run-reviewed-supabase-cli.mjs');
  const status = await runReviewedSupabaseCli({
    args: ['--version'],
    workspace: fileURLToPath(new URL('../../../', import.meta.url)),
  });
  if (status !== 0) throw new Error('version');
}

main().catch(() => {
  process.stderr.write('Protected toolchain verification refused; no database operation is available.\n');
  process.exitCode = 1;
});
