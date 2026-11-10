import { it, expect } from 'vitest';
import {
  reviewBody,
  commentBody,
  commentPatch,
  reportBody,
  resolutionBody,
  recipeModerationBody,
  commentModerationBody,
  socialQuery,
  keyHeaders,
  socialId,
} from '../../src/modules/social/social.validation.js';
import {
  reviewDTO,
  commentDTO,
  reportDTO,
  adminReportDTO,
} from '../../src/modules/social/social.dto.js';
import { loadSpec } from '../../src/openapi/docs.js';
import { schemaValidator } from '../../../scripts/openapi-contract.js';
const a = '0123456789abcdef01234567';
it.each([0, 6, -1, 3.5, '3', null, {}, [], NaN, Infinity])(
  'REV-05 rating rejects %j',
  (rating) => expect(reviewBody.safeParse({ rating }).success).toBe(false),
);
it.each([
  { rating: 4, content: 'x'.repeat(1001) },
  { rating: 4, content: '<script>' },
  { rating: 4, content: 'text\n' },
  { rating: 4, content: {} },
  { rating: 4, userId: a },
  { rating: 4, status: 'visible' },
])('REV-06 strict review rejects %j', (v) =>
  expect(reviewBody.safeParse(v).success).toBe(false),
);
it('REV-05/06 Unicode NFC and edge ratings match OAS request schemas', () => {
  const spec = loadSpec(),
    validates = schemaValidator(spec);
  for (const rating of [1, 5]) {
    const body = reviewBody.parse({
      rating,
      content: '  Tiếng Việt '.normalize('NFD'),
    });
    expect(body.content).toBe('Tiếng Việt');
    validates(spec.components.schemas.ReviewRequest, body);
  }
  expect(reviewBody.parse({ rating: 1 }).content).toBe('');
});
it.each([
  { content: '' },
  { content: ' ' },
  { content: 'x'.repeat(1501) },
  { content: '<b>x</b>' },
  { content: 'x\u0000' },
  { content: 'x\u200d' },
  { content: 'x', authorId: a },
  { content: 'x', status: 'visible' },
  { content: 'x', parentId: 'bad' },
])('COM-16 rejects comment %j', (v) =>
  expect(commentBody.safeParse(v).success).toBe(false),
);
it('COM-07/16 patch requires version and cannot change parent/owner', () => {
  expect(commentPatch.safeParse({ content: 'Hi' }).success).toBe(false);
  expect(
    commentPatch.safeParse({ content: 'Hi', version: 0, parentId: a }).success,
  ).toBe(false);
  expect(commentPatch.parse({ content: '  Bình luận ', version: 0 })).toEqual({
    content: 'Bình luận',
    version: 0,
  });
});
it.each([
  { targetType: 'review', targetId: a, reason: 'spam' },
  { targetType: 'recipe', targetId: 'bad', reason: 'spam' },
  { targetType: 'recipe', targetId: a, reason: 'inappropriate_content' },
  {
    targetType: 'recipe',
    targetId: a,
    reason: 'other',
    details: 'x'.repeat(2001),
  },
  { targetType: 'recipe', targetId: a, reason: 'spam', status: 'resolved' },
])('RPT-03/07 rejects report %j', (v) =>
  expect(reportBody.safeParse(v).success).toBe(false),
);
it.each([
  {
    version: 0,
    resolution: 'rejected',
    action: 'hide',
    targetVersion: 0,
    reason: 'No',
  },
  { version: 0, resolution: 'resolved', action: 'hide', reason: 'Yes' },
  {
    version: 0,
    resolution: 'resolved',
    action: 'none',
    targetVersion: 0,
    reason: 'Yes',
  },
  { version: 0, resolution: 'pending', action: 'none', reason: 'No' },
  { version: '0', resolution: 'resolved', action: 'none', reason: 'No' },
])('RPT-10/11 strict decision rejects %j', (v) =>
  expect(resolutionBody.safeParse(v).success).toBe(false),
);
it('MOD-06/14/15 admin schemas prevent rewriting protected content', () => {
  for (const schema of [recipeModerationBody, commentModerationBody]) {
    expect(
      schema.safeParse({
        version: 0,
        status: 'hidden',
        reason: 'Review',
        content: 'edit',
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ version: 0, status: 'hidden', reason: '' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        version: Number.MAX_SAFE_INTEGER,
        status: 'hidden',
        reason: 'Reason',
      }).success,
    ).toBe(false);
  }
});
it('QA-02 key, ID, query bounds strict', () => {
  expect(keyHeaders.safeParse({ 'idempotency-key': 'bad' }).success).toBe(
    false,
  );
  expect(socialId.safeParse(a + '\n').success).toBe(false);
  for (const q of [
    { page: 1001 },
    { limit: 101 },
    { sort: 'rating' },
    { userId: a },
  ])
    expect(socialQuery.safeParse(q).success).toBe(false);
});
it('AUD-03/10 public/admin DTO whitelist does not serialize sensitive internals', () => {
  const raw = {
    _id: a,
    recipeId: a,
    parentId: null,
    content: 'Good',
    rating: 5,
    version: 0,
    publicAuthor: { _id: a, displayName: 'Cook', email: 'private' },
    createdAt: new Date(),
    updatedAt: new Date(),
    targetType: 'recipe',
    targetId: a,
    status: 'pending',
    reporterId: a,
    reason: 'spam',
    details: 'Text',
    moderationIntent: a,
    decisionIntent: a,
    plan: { secret: 'private' },
    passwordHash: 'private',
    cloudinary: { publicId: 'private' },
    creationKey: 'private',
  };
  for (const dto of [
    reviewDTO(raw),
    commentDTO(raw),
    reportDTO(raw),
    adminReportDTO(raw),
  ])
    expect(JSON.stringify(dto)).not.toMatch(
      /email|passwordHash|moderationIntent|decisionIntent|creationKey|publicId|private/,
    );
});
