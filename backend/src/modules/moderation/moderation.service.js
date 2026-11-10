import { createHash } from 'node:crypto';
import { activeActor, fail } from '../social/social.policy.js';
import { moderationReceipt } from '../social/social.dto.js';
const actions = [
  'recipe_moderation',
  'comment_moderation',
  'report_resolution',
];
const same = (a, b) => String(a ?? '') === String(b ?? '');
const uncertain = () =>
  fail(
    503,
    'MODERATION_UNCERTAIN',
    'Decision requires reconciliation; retry with the same Idempotency-Key',
  );
export function createModerationService({
  Recipe,
  Comment,
  Report,
  User,
  AuditLog,
}) {
  const model = (kind) =>
    kind === 'recipe' ? Recipe : kind === 'comment' ? Comment : Report;
  const stateField = (kind) =>
    kind === 'recipe' ? 'moderationStatus' : 'status';
  const marker = (kind) =>
    kind === 'report' ? 'decisionIntent' : 'moderationIntent';
  async function auditIntent(data) {
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          action: data.action,
          targetType: data.targetType,
          targetId: String(data.targetId),
          after: data.after,
          plan: data.plan,
          reason: data.reason,
        }),
      )
      .digest('hex');
    let row = await AuditLog.findOne({
      operationKey: data.operationKey,
    }).select('+fingerprint');
    if (!row)
      try {
        row = await AuditLog.create({ ...data, fingerprint });
      } catch (err) {
        if (err.code !== 11000) throw err;
        row = await AuditLog.findOne({
          operationKey: data.operationKey,
        }).select('+fingerprint');
      }
    if (!row || row.fingerprint !== fingerprint)
      fail(409, 'IDEMPOTENCY_CONFLICT', 'Key belongs to a different decision');
    return row;
  }
  async function clearMarker(row) {
    const Model = model(row.targetType),
      field = marker(row.targetType);
    await Model.updateOne(
      { _id: row.targetId, [field]: row._id },
      { $set: { [field]: null } },
      { timestamps: false },
    );
    await AuditLog.updateOne(
      { _id: row._id },
      { $set: { reconciledAt: new Date() } },
    );
  }
  async function conflict(row) {
    // Fences any delayed report claimant before releasing its durable decision.
    if (row.targetType === 'report')
      await Report.updateOne(
        { _id: row.targetId, status: 'pending', decisionIntent: row._id },
        { $set: { decisionIntent: null }, $inc: { version: 1 } },
      );
    await AuditLog.updateOne(
      { _id: row._id, outcome: 'pending' },
      { $set: { outcome: 'conflict', reconciledAt: new Date() } },
    );
    fail(
      409,
      'VERSION_CONFLICT',
      'Target changed; fetch current state before a new decision',
    );
  }
  async function applied(row) {
    await AuditLog.updateOne(
      { _id: row._id, outcome: 'pending' },
      { $set: { outcome: 'applied' } },
    );
    await clearMarker(row);
    return moderationReceipt(row);
  }
  async function executeTarget(row) {
    const Model = model(row.targetType),
      field = stateField(row.targetType);
    let target = await Model.findById(row.targetId).select('+moderationIntent');
    if (same(target?.moderationIntent, row._id)) return applied(row);
    const result = await Model.findOneAndUpdate(
      {
        _id: row.targetId,
        version: row.plan.expectedVersion,
        [field]: row.before.status,
        moderationIntent: null,
        deletedAt: null,
        ...(row.targetType === 'recipe'
          ? { creationState: 'complete', publishedAt: { $ne: null } }
          : { creationState: 'complete' }),
      },
      {
        $set: {
          [field]: row.after.status,
          moderationReason: row.reason,
          moderationIntent: row._id,
        },
        $inc: { version: 1 },
      },
      { returnDocument: 'after', runValidators: true },
    );
    if (!result) {
      const fresh = await AuditLog.findById(row._id);
      if (fresh.outcome === 'applied') {
        await clearMarker(fresh);
        return moderationReceipt(fresh);
      }
      target = await Model.findById(row.targetId).select('+moderationIntent');
      if (!same(target?.moderationIntent, row._id)) return conflict(row);
    }
    return applied(row);
  }
  async function executeReport(row) {
    let report = await Report.findById(row.targetId).select('+decisionIntent');
    if (!same(report?.decisionIntent, row._id)) {
      const claimed = await Report.findOneAndUpdate(
        {
          _id: row.targetId,
          version: row.plan.expectedVersion,
          status: 'pending',
          decisionIntent: null,
        },
        { $set: { decisionIntent: row._id } },
        { returnDocument: 'after' },
      );
      if (!claimed) {
        const fresh = await AuditLog.findById(row._id);
        if (fresh.outcome === 'applied') {
          await clearMarker(fresh);
          return moderationReceipt(fresh);
        }
        report = await Report.findById(row.targetId).select('+decisionIntent');
        if (!same(report?.decisionIntent, row._id)) return conflict(row);
      } else report = claimed;
    }
    if (report.status === 'pending') {
      if (row.plan.resolutionAction === 'hide') {
        const child = await auditIntent({
          actorId: row.actorId,
          action: `${row.plan.targetType}_moderation`,
          targetType: row.plan.targetType,
          targetId: row.plan.targetId,
          reason: row.reason,
          requestId: row.requestId,
          operationKey: `${row.operationKey}:target`,
          before: {
            status: row.plan.targetStatus,
            version: row.plan.targetVersion,
          },
          after: { status: 'hidden', version: row.plan.targetVersion + 1 },
          plan: { expectedVersion: row.plan.targetVersion },
        });
        try {
          await execute(child);
        } catch (err) {
          if (err.status === 409) return conflict(row);
          throw err;
        }
      }
      const changed = await Report.findOneAndUpdate(
        {
          _id: row.targetId,
          status: 'pending',
          version: row.plan.expectedVersion,
          decisionIntent: row._id,
        },
        {
          $set: {
            status: row.after.status,
            reviewedBy: row.actorId,
            reviewedAt: new Date(),
            resolutionNote: row.reason,
            resolutionAction: row.plan.resolutionAction,
          },
          $inc: { version: 1 },
        },
        { returnDocument: 'after', runValidators: true },
      );
      if (!changed) {
        report = await Report.findById(row.targetId).select('+decisionIntent');
        if (
          !same(report?.decisionIntent, row._id) ||
          report.status !== row.after.status
        )
          uncertain();
      }
    } else if (report.status !== row.after.status) uncertain();
    return applied(row);
  }
  async function execute(input) {
    const row = await AuditLog.findById(input._id);
    if (row.outcome === 'conflict')
      fail(
        409,
        'VERSION_CONFLICT',
        'Decision conflicted; use a new key with current state',
      );
    if (row.outcome === 'applied') {
      await clearMarker(row);
      return moderationReceipt(row);
    }
    if (row.targetType === 'report') return executeReport(row);
    return executeTarget(row);
  }
  async function executeSafely(row) {
    try {
      return await execute(row);
    } catch (err) {
      if (err.status === 409) throw err;
      uncertain();
    }
  }
  async function existing(key, actor, kind, id, body) {
    const row = await AuditLog.findOne({ operationKey: `${actor}:${key}` });
    if (!row) return null;
    const expected =
      row.plan.expectedVersion === body.version &&
      same(row.targetId, id) &&
      row.targetType === kind &&
      row.reason === body.reason &&
      row.after.status === (body.resolution ?? body.status) &&
      (kind !== 'report' ||
        (row.plan.resolutionAction === body.action &&
          row.plan.targetVersion === body.targetVersion));
    if (!expected)
      fail(409, 'IDEMPOTENCY_CONFLICT', 'Key belongs to a different decision');
    return executeSafely(row);
  }
  async function moderate(actor, kind, id, body, key, requestId) {
    const actorId = await activeActor(User, actor, true);
    const replay = await existing(key, actorId, kind, id, body);
    if (replay) return replay;
    const target = await model(kind).findById(id).select('+moderationIntent');
    if (
      !target ||
      target.deletedAt ||
      target.creationState !== 'complete' ||
      (kind === 'recipe' && !target.publishedAt)
    )
      fail(404, 'TARGET_NOT_FOUND', 'Moderation target not found');
    if (target.moderationIntent)
      fail(409, 'MODERATION_PENDING', 'Previous decision needs reconciliation');
    const field = stateField(kind);
    if (target.version !== body.version)
      fail(409, 'VERSION_CONFLICT', 'Target version changed');
    if (target[field] === body.status)
      fail(409, 'STATE_CONFLICT', 'Target already has that moderation state');
    let row;
    try {
      row = await auditIntent({
        actorId,
        action: `${kind}_moderation`,
        targetType: kind,
        targetId: target._id,
        reason: body.reason,
        requestId,
        operationKey: `${actorId}:${key}`,
        before: { status: target[field], version: target.version },
        after: { status: body.status, version: target.version + 1 },
        plan: { expectedVersion: target.version },
      });
    } catch (err) {
      if (err.status === 409) throw err;
      uncertain();
    }
    return executeSafely(row);
  }
  async function resolve(actor, id, body, key, requestId) {
    const actorId = await activeActor(User, actor, true);
    const replay = await existing(key, actorId, 'report', id, body);
    if (replay) return replay;
    const report = await Report.findById(id).select('+decisionIntent');
    if (!report) fail(404, 'REPORT_NOT_FOUND', 'Report not found');
    if (report.decisionIntent)
      fail(409, 'REPORT_PROCESSING', 'Report already has a durable decision');
    if (report.status !== 'pending' || report.version !== body.version)
      fail(409, 'VERSION_CONFLICT', 'Report no longer pending at this version');
    // Read current target even for action=none; missing/deleted targets can be resolved without mutation.
    const target = await model(report.targetType)
      .findById(report.targetId)
      .select('+moderationIntent');
    const field = stateField(report.targetType);
    if (body.action === 'hide') {
      if (
        !target ||
        target.deletedAt ||
        target.creationState !== 'complete' ||
        (report.targetType === 'recipe' && !target.publishedAt)
      )
        fail(
          409,
          'TARGET_UNAVAILABLE',
          'Target cannot be moderated; use action none',
        );
      if (target.moderationIntent)
        fail(409, 'MODERATION_PENDING', 'Target decision needs reconciliation');
      if (target.version !== body.targetVersion || target[field] === 'hidden')
        fail(409, 'VERSION_CONFLICT', 'Target changed; use current state');
    }
    let row;
    try {
      row = await auditIntent({
        actorId,
        action: 'report_resolution',
        targetType: 'report',
        targetId: report._id,
        reason: body.reason,
        requestId,
        operationKey: `${actorId}:${key}`,
        before: { status: 'pending', version: report.version },
        after: { status: body.resolution, version: report.version + 1 },
        plan: {
          expectedVersion: report.version,
          resolutionAction: body.action,
          ...(body.action === 'hide'
            ? {
                targetType: report.targetType,
                targetId: report.targetId,
                targetVersion: body.targetVersion,
                targetStatus: target[field],
              }
            : {}),
        },
      });
    } catch (err) {
      if (err.status === 409) throw err;
      uncertain();
    }
    return executeSafely(row);
  }
  async function reconcile({ limit = 20, dryRun = false } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Invalid reconciliation batch');
    const rows = await AuditLog.find({
      action: { $in: actions },
      reconciledAt: null,
    })
      .sort({ _id: 1 })
      .limit(limit)
      .maxTimeMS(3000);
    const result = {
      scanned: rows.length,
      applied: 0,
      conflicted: 0,
      uncertain: 0,
      dryRun,
    };
    if (!dryRun)
      for (const row of rows)
        try {
          await execute(row);
          result.applied++;
        } catch (err) {
          if (err.status === 409) result.conflicted++;
          else result.uncertain++;
        }
    return result;
  }
  return { moderate, resolve, reconcile };
}
