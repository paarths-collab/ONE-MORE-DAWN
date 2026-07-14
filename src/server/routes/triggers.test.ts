import { beforeEach, describe, expect, it, vi } from 'vitest';
import { triggers } from './triggers';

/**
 * Install glue for /internal/triggers/on-app-install. The Devvit runtime is
 * mocked at the module boundary: `context` supplies the subreddit name that
 * feeds the success message and `reddit.submitCustomPost` stands in for the
 * post creation core/post.ts delegates to.
 */
const runtime = vi.hoisted(() => ({
  context: {
    subredditName: 'testsub' as string | undefined,
  },
  reddit: {
    submitCustomPost: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => runtime);

const install = (body: unknown = { type: 'AppInstall' }) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  runtime.context.subredditName = 'testsub';
});

describe('POST /internal/triggers/on-app-install', () => {
  it('creates the initial game post on install and reports the subreddit + post id', async () => {
    runtime.reddit.submitCustomPost.mockResolvedValue({ id: 't3_install1' });

    const res = await triggers.request('/on-app-install', install());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; message: string };
    expect(body.status).toBe('success');
    expect(body.message).toContain('testsub');
    expect(body.message).toContain('t3_install1');
    expect(body.message).toContain('AppInstall');
    expect(runtime.reddit.submitCustomPost).toHaveBeenCalledTimes(1);
  });

  it('reports failure without throwing when the post already exists', async () => {
    // Reinstall onto a subreddit that already has the game post: Reddit rejects
    // the duplicate, so the handler must surface a clean 400 rather than crash.
    runtime.reddit.submitCustomPost.mockRejectedValue(new Error('a post already exists'));

    const res = await triggers.request('/on-app-install', install());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ status: 'error', message: 'Failed to create post' });
  });
});
