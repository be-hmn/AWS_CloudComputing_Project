import { store, seq } from '../store/memoryStore.js';

export const recordRepo = {
  insert({ application_id, summary, follow_up_task, needs_next_consultation, attachment_key }) {
    const aid = Number(application_id);
    for (const row of store.consultation_records.values()) {
      if (row.application_id === aid) {
        const err = new Error('RECORD_ALREADY_EXISTS');
        err.code = 'RECORD_ALREADY_EXISTS';
        throw err;
      }
    }

    const id = seq.consultation_records.next();
    const created = {
      id,
      application_id: aid,
      summary,
      follow_up_task: follow_up_task ?? null,
      needs_next_consultation: !!needs_next_consultation,
      attachment_key: attachment_key ?? null,
      created_at: new Date().toISOString(),
    };
    store.consultation_records.set(id, created);
    return created;
  },

  findByApplication(applicationId) {
    const aid = Number(applicationId);
    for (const row of store.consultation_records.values()) {
      if (row.application_id === aid) return row;
    }
    return null;
  },

  listAll() {
    return Array.from(store.consultation_records.values()).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  },

  countCompletedByApplicationIds(applicationIds) {
    // applicationIds: Set<number>
    let n = 0;
    for (const r of store.consultation_records.values()) {
      if (applicationIds.has(r.application_id)) n += 1;
    }
    return n;
  },
};
