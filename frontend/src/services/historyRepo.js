import {
  collection,
  collectionGroup,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { HISTORY_PAGE_WEEKS } from '../config/constants';

/**
 * Pages through weeks newest-first. Each page is `HISTORY_PAGE_WEEKS` week documents plus their
 * assignments, so the list can grow indefinitely without loading everything up front.
 *
 * @returns {{ weeks: {weekId: string, assignments: object[]}[], cursor: any, done: boolean }}
 */
export async function fetchWeeksPage(cursor = null, size = HISTORY_PAGE_WEEKS) {
  const base = [collection(db, 'weeks'), orderBy(documentId(), 'desc')];
  if (cursor) base.push(startAfter(cursor));
  base.push(limit(size));
  const snap = await getDocs(query(...base));

  const weeks = await Promise.all(
    snap.docs.map(async (w) => {
      const as = await getDocs(collection(db, 'weeks', w.id, 'assignments'));
      return { weekId: w.id, assignments: as.docs.map((d) => ({ id: d.id, ...d.data() })) };
    }),
  );
  return {
    weeks,
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor,
    done: snap.docs.length < size,
  };
}

/**
 * Cross-date search. Firestore has no substring search, so this runs two indexed prefix queries
 * (student name, area name) over every week at once. The caller additionally substring-filters
 * whatever pages are already loaded, which together give "contains" behaviour on loaded history
 * and "starts with" behaviour on history that has not been paged in yet.
 */
export async function searchAssignments(term, max = 300) {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const end = `${t}`;
  const run = (field) =>
    getDocs(
      query(collectionGroup(db, 'assignments'), where(field, '>=', t), where(field, '<=', end), orderBy(field), limit(max)),
    );
  const [byName, byArea] = await Promise.all([run('nameLower'), run('areaLower')]);
  const seen = new Map();
  [...byName.docs, ...byArea.docs].forEach((d) => {
    // path: weeks/{weekId}/assignments/{id}
    const weekId = d.ref.parent.parent.id;
    seen.set(`${weekId}/${d.id}`, { weekId, assignment: { id: d.id, ...d.data() } });
  });
  return [...seen.values()];
}
