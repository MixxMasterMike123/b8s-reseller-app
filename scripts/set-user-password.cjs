/**
 * set-user-password.cjs — directly set a Firebase Auth user's password via the
 * Admin SDK. NO email is sent (unlike the Console "Reset password" flow), so it
 * works even while the custom SMTP/email path is down. Useful for a controlled
 * admin/super-admin account reset.
 *
 * Runs with Application Default Credentials (your gcloud login) — the SAME setup
 * that set-platform-admin.cjs uses. Run it from YOUR machine where you're
 * authenticated to the project.
 *
 * Idempotent + DRY-RUN by default. Looks the user up by email.
 *
 * USAGE (Mikael runs — live Auth write, STOP-and-surface class):
 *   node scripts/set-user-password.cjs <email> '<newPassword>'            # dry run
 *   node scripts/set-user-password.cjs <email> '<newPassword>' --commit   # write
 *
 * Notes:
 *   - Password must be >= 6 chars (Firebase minimum).
 *   - Wrap the password in SINGLE QUOTES so the shell doesn't expand $ ! etc.
 *   - After a successful reset the user can sign in immediately; no email, no
 *     verification step required for an existing account.
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getAuth } = functionsRequire('firebase-admin/auth');

const PROJECT_ID = 'b8shield-reseller-app';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const positional = args.filter((a) => !a.startsWith('--'));
const email = (positional[0] || '').trim().toLowerCase();
const newPassword = positional[1] || '';

if (!email || !newPassword) {
  console.error("Usage: node scripts/set-user-password.cjs <email> '<newPassword>' [--commit]");
  process.exit(1);
}
if (newPassword.length < 6) {
  console.error('❌ Password must be at least 6 characters (Firebase minimum).');
  process.exit(1);
}

// The Identity Toolkit (Auth) API requires a QUOTA PROJECT when authenticating
// with local end-user ADC (gcloud login). Without it the call is billed to
// Google's default CLI project (764086051850) where the API is disabled →
// `auth/internal-error` / SERVICE_DISABLED. Force our project as the quota
// project so getUserByEmail/updateUser route correctly. (Also run once:
//   gcloud auth application-default set-quota-project b8shield-reseller-app )
process.env.GOOGLE_CLOUD_QUOTA_PROJECT = process.env.GOOGLE_CLOUD_QUOTA_PROJECT || PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || PROJECT_ID;

admin.initializeApp({ projectId: PROJECT_ID });

async function main() {
  console.log('🔑 Set user password (Admin SDK — no email sent)');
  console.log(`   project: ${PROJECT_ID}`);
  console.log(`   email:   ${email}`);
  console.log(`   newPass: ${'*'.repeat(newPassword.length)} (${newPassword.length} chars)`);
  console.log(`   mode:    ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (e) {
    console.error(`❌ Could not find Auth user for ${email}: ${e.code || e.message}`);
    console.error('   (If this is a credential/Auth-API error, run from your authenticated machine.)');
    process.exit(1);
  }

  console.log('Found Auth user:');
  console.log(`   uid:           ${user.uid}`);
  console.log(`   disabled:      ${user.disabled}`);
  console.log(`   emailVerified: ${user.emailVerified}`);
  console.log('');

  if (!COMMIT) {
    console.log('🟡 Dry run complete. Re-run with --commit to set the password.');
    return;
  }

  await getAuth().updateUser(user.uid, { password: newPassword });
  console.log('🔴 ✅ Password updated. The user can sign in now with the new password.');
  console.log('   No email was sent. Hand the password over securely + have them change it.');
}

main().then(() => process.exit(0)).catch((e) => { console.error('❌ failed:', e); process.exit(1); });
