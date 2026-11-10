import { parseEnv } from '../src/config/env.js';
import { createEmailProvider } from '../src/integrations/email-provider.js';

if (process.argv.slice(2).join(' ') !== '--connect') {
  process.stdout.write(
    'No connection made. Use --connect only after configuring a new App Password outside chat. This command never sends email.\n',
  );
} else {
  try {
    const provider = createEmailProvider(parseEnv(process.env));
    await provider.verify();
    process.stdout.write(
      'SMTP connection verified. No message sent; inbox delivery is not verified.\n',
    );
  } catch {
    process.stderr.write(
      'SMTP verification failed. Check local configuration, TLS and credentials; provider details omitted.\n',
    );
    process.exitCode = 1;
  }
}
