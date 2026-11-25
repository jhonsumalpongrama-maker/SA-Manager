import { writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const CHUNK = 400; // Firestore allows 500 writes per batch; stay well below.

/**
 * Runs many write operations in as many atomic batches as needed.
 * `ops` is an array of functions that receive the batch: (batch) => batch.set(...).
 *
 * All batches are committed at once (not one after another) so that while offline every chunk is
 * queued immediately and the local cache reflects the whole change. The returned promise resolves
 * when the server has acknowledged every batch (so it stays pending while offline).
 * Each chunk is atomic; a very large change spanning several chunks is not atomic as a whole.
 */
export function commitInChunks(ops) {
  const commits = [];
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db);
    ops.slice(i, i + CHUNK).forEach((op) => op(batch));
    commits.push(batch.commit());
  }
  return Promise.all(commits);
}
