import { describe, it, expect, beforeEach } from 'vitest';
import { TrackRepository } from '../src/db/repos';
import { D1Client } from '../src/db/d1';
import { MockD1Database } from './helpers/mockD1';

let repo: TrackRepository;

beforeEach(() => {
  repo = new TrackRepository(new D1Client(new MockD1Database()));
});

describe('TrackRepository', () => {
  it('inserts and lists tracks per user', async () => {
    const userId = await repo.upsertUser('123');
    await repo.insertTrack(userId, 'https://e.com/1', 'e.com', 'hash1', new Date().toISOString());
    await repo.insertTrack(userId, 'https://e.com/2', 'e.com', 'hash2', new Date().toISOString());
    const tracks = await repo.getActiveTracksByUser(userId);
    expect(tracks).toHaveLength(2);
  });

  it('returns due tracks ordered by next_check_at', async () => {
    const userId = await repo.upsertUser('123');
    const now = new Date('2024-01-01T00:00:00Z');
    await repo.insertTrack(userId, 'https://e.com/1', 'e.com', 'hash1', new Date(now.getTime() - 1000).toISOString());
    await repo.insertTrack(userId, 'https://e.com/2', 'e.com', 'hash2', new Date(now.getTime() + 3600).toISOString());
    const due = await repo.getDueTracks(now.toISOString(), 10);
    expect(due).toHaveLength(1);
    expect(due[0].url).toContain('/1');
  });

  it('deletes tracks and reports count for deleteAllByUser', async () => {
    const userId = await repo.upsertUser('123');
    await repo.insertTrack(userId, 'https://e.com/1', 'e.com', 'hash1', new Date().toISOString());
    await repo.insertTrack(userId, 'https://e.com/2', 'e.com', 'hash2', new Date().toISOString());
    const removed = await repo.deleteAllByUser(userId);
    expect(removed).toBe(2);
    const tracks = await repo.getActiveTracksByUser(userId);
    expect(tracks).toHaveLength(0);
  });
});
