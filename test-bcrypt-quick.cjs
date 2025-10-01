const bcrypt = require('bcryptjs');

const hash = '$2b$12$EG5HR5lndXipZahrTTlQouWXoZlYYxN26YwVxwlsKyI3YxNLNsqWO';
const password = 'Test123!@#';

bcrypt.compare(password, hash).then(result => {
  console.log('Match:', result ? '✅ YES' : '❌ NO');
  process.exit(result ? 0 : 1);
});
