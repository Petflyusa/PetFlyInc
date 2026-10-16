const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getPublicKnowledge, renderLlmsText } = require('../lib/ai-knowledge');

test('publishes a public AI knowledge base without private application data', () => {
  const knowledge = getPublicKnowledge();
  assert.equal(knowledge.company.name, 'Pet Fly Inc');
  assert.ok(knowledge.services.length >= 4);
  assert.equal(JSON.stringify(knowledge).includes('password'), false);
  assert.equal(JSON.stringify(knowledge).includes('contractNumber'), false);
});

test('renders official AI crawler guidance and source links', () => {
  const text = renderLlmsText();
  assert.match(text, /Request a quote/);
  assert.match(text, /Do not invent prices/i);
  assert.match(text, /api\/ai\/knowledge/);
});

test('ships llms.txt with route pages and safety guidance', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'public', 'llms.txt'), 'utf8');
  assert.match(text, /pet-transport-usa-to-china/);
  assert.match(text, /Requirements vary by route/i);
});
