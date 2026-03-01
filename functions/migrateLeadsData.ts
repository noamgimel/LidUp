import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Maps old status → lifecycle
const STATUS_TO_LIFECYCLE = {
  client:   'won',
  inactive: 'lost',
  lead:     'open',
  hot_lead: 'open'
};

// Maps old status → priority
const STATUS_TO_PRIORITY = {
  hot_lead: 'hot',
  lead:     'warm',
  client:   'warm',
  inactive: 'cold'
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let user = null;
  try { user = await base44.auth.me(); } catch (e) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // Fetch all clients (service role)
  const all = await base44.asServiceRole.entities.Client.list('-created_date', 5000);
  console.log('[migrate] total records:', all.length);

  let updated = 0;
  for (const c of all) {
    const needsLifecycle = !c.lifecycle;
    const needsPriority  = !c.priority;
    if (!needsLifecycle && !needsPriority) continue;

    const patch = {};
    if (needsLifecycle) patch.lifecycle = STATUS_TO_LIFECYCLE[c.status] || 'open';
    if (needsPriority)  patch.priority  = STATUS_TO_PRIORITY[c.status]  || 'warm';

    await base44.asServiceRole.entities.Client.update(c.id, patch);
    updated++;
  }

  return Response.json({ ok: true, total: all.length, updated });
});