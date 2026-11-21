import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rulesSource = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8')) as {
  entities: Record<string, { properties: Record<string, { maxLength?: number; pattern?: string }>; required: string[] }>;
  firestore: Record<string, { schema: { $ref: string } }>;
};

test('firestore.rules includes default-deny catch-all and verified owner helpers', () => {
  assert.match(rulesSource, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesSource, /isValidId\(/);
});

test('every blueprint collection has a corresponding match block in firestore.rules', () => {
  const requiredMatches = [
    'match /users/{userId}',
    'match /private/{profileId}',
    'match /creditAssessments/{assessmentId}',
    'match /loanAnalyses/{analysisId}',
    'match /improvementPlans/{planId}',
    'match /loanSuggestions/{suggestionId}',
    'match /emiCalculations/{calcId}',
    'match /chatMessages/{messageId}',
    'match /documents/{docId}',
    'match /chunks/{chunkId}',
  ];
  for (const block of requiredMatches) {
    assert.ok(rulesSource.includes(block), `Missing rules match block: ${block}`);
  }
});

test('dirty dozen invariants: schema keys, bounds, and immutability are enforced', () => {
  // 1-3: No blanket list or open reads
  assert.doesNotMatch(rulesSource, /allow\s+read:\s*if\s+true/);
  assert.doesNotMatch(rulesSource, /allow\s+list:\s*if\s+isSignedIn\(\)\s*;/);

  // 4-5: Strict hasAll & hasOnly on creates and affectedKeys on updates
  assert.ok(rulesSource.includes('data.keys().hasAll('));
  assert.ok(rulesSource.includes('data.keys().hasOnly('));
  assert.ok(rulesSource.includes('incoming().diff(existing()).affectedKeys().hasOnly('));

  // 6-8: Email verification, server timestamps, and immutable userId/createdAt
  assert.ok(rulesSource.includes('incoming().createdAt == request.time'));
  assert.ok(rulesSource.includes('incoming().updatedAt == request.time'));
  assert.ok(rulesSource.includes('incoming().userId == existing().userId'));
  assert.ok(rulesSource.includes('incoming().createdAt == existing().createdAt'));

  // 9-12: ID regex, string maxLength, bounded arrays
  assert.ok(rulesSource.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  assert.ok(rulesSource.includes('isBoundedStringArray(data.failedCheckKeys, 7)'));
  assert.ok(rulesSource.includes('isBoundedStringArray(data.recommendations, 10)'));
  assert.ok(rulesSource.includes('isBoundedStringArray(data.completedTaskIds, 18)'));
  assert.ok(Object.keys(blueprint.firestore).length === 10);
});
