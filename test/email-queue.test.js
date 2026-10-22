const test = require('node:test');
const assert = require('node:assert/strict');
const { processNextEmail } = require('../lib/email-queue');

test('processes JSON columns returned as arrays by mysql2', async () => {
  const statements = [];
  const pool = {
    execute: async (sql) => {
      statements.push(sql);
      if (/^SELECT id, to_email/.test(sql)) {
        return [[{ id: 7, to_email: 'info@petflyinc.com', subject: 'Test', html_content: '<p>Test</p>', text_content: 'Test', attachments_json: [], attempts: 0 }]];
      }
      if (/^UPDATE outbound_emails SET status='processing'/.test(sql)) return [{ affectedRows: 1 }];
      return [{ affectedRows: 1 }];
    }
  };
  let delivered;
  const processed = await processNextEmail(pool, async email => {
    delivered = email;
    return true;
  });
  assert.equal(processed, true);
  assert.deepEqual(delivered.attachments, []);
  assert.match(statements.at(-1), /status='sent'/);
  assert.match(statements[0], /ORDER BY CASE WHEN status='pending'/);
});

test('treats empty attachment JSON values as no attachments', async () => {
  const pool = {
    execute: async (sql) => {
      if (/^SELECT id, to_email/.test(sql)) {
        return [[{ id: 8, to_email: 'info@petflyinc.com', subject: 'Test', html_content: '<p>Test</p>', text_content: 'Test', attachments_json: '', attempts: 0 }]];
      }
      if (/^UPDATE outbound_emails SET status='processing'/.test(sql)) return [{ affectedRows: 1 }];
      return [{ affectedRows: 1 }];
    }
  };
  let delivered;
  await processNextEmail(pool, async email => { delivered = email; return true; });
  assert.deepEqual(delivered.attachments, []);
});
