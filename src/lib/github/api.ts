import { GITHUB_API, USER_AGENT } from './config';

/**
 * Thin wrapper around the GitHub REST API. We only need a handful of endpoints
 * (user, repo create, contents, trees, ref) so we hand-roll instead of pulling
 * in Octokit (~150 kB) for no benefit on mobile.
 */

const headers = (token: string): Record<string, string> => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': USER_AGENT,
  'X-GitHub-Api-Version': '2022-11-28',
});

const handle = async (res: Response, label: string): Promise<unknown> => {
  if (res.status === 204) return null;
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === 'object' && 'message' in parsed
        ? (parsed as { message: string }).message
        : null) ?? `HTTP ${res.status}`;
    const err = new Error(`${label}: ${msg}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return parsed;
};

export interface GHUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
}

export const getUser = async (token: string): Promise<GHUser> =>
  (await handle(
    await fetch(`${GITHUB_API}/user`, { headers: headers(token) }),
    'getUser'
  )) as GHUser;

export interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  owner: { login: string };
  html_url: string;
}

export const getRepo = async (
  token: string,
  owner: string,
  repo: string
): Promise<GHRepo | null> => {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: headers(token),
  });
  if (res.status === 404) return null;
  return (await handle(res, 'getRepo')) as GHRepo;
};

export interface CreateRepoOptions {
  name: string;
  description?: string;
  privateRepo?: boolean;
  autoInit?: boolean;
}

export const createRepo = async (
  token: string,
  opts: CreateRepoOptions
): Promise<GHRepo> =>
  (await handle(
    await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: opts.name,
        description: opts.description,
        private: opts.privateRepo ?? true,
        auto_init: opts.autoInit ?? true,
      }),
    }),
    'createRepo'
  )) as GHRepo;

/* ----------------------------- File contents ----------------------------- */

export interface RemoteFile {
  sha: string;
  content: string; // base64
  encoding: 'base64';
  path: string;
}

export const getFile = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<RemoteFile | null> => {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: headers(token) });
  if (res.status === 404) return null;
  return (await handle(res, 'getFile')) as RemoteFile;
};

export const putFile = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
  message: string,
  contentBase64: string,
  sha?: string
): Promise<{ commit: { sha: string } }> =>
  (await handle(
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch,
        sha,
      }),
    }),
    'putFile'
  )) as { commit: { sha: string } };

/* --------------------------- Multi-file commit --------------------------- */
/* Uses the Git Data API so we can commit any number of files atomically.   */

export interface BlobRef {
  path: string;
  content: string; // utf-8
}

export const createCommitWithFiles = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: BlobRef[]
): Promise<{ commitSha: string }> => {
  // 1. Get ref
  const ref = (await handle(
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
      headers: headers(token),
    }),
    'getRef'
  )) as { object: { sha: string } };
  const parentCommitSha = ref.object.sha;

  // 2. Get parent commit's tree
  const parentCommit = (await handle(
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, {
      headers: headers(token),
    }),
    'getCommit'
  )) as { tree: { sha: string } };
  const baseTreeSha = parentCommit.tree.sha;

  // 3. Create blobs
  const blobShas: { path: string; sha: string }[] = [];
  for (const f of files) {
    const blob = (await handle(
      await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
      }),
      'createBlob'
    )) as { sha: string };
    blobShas.push({ path: f.path, sha: blob.sha });
  }

  // 4. Create tree
  const tree = (await handle(
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: blobShas.map(b => ({
          path: b.path,
          mode: '100644',
          type: 'blob',
          sha: b.sha,
        })),
      }),
    }),
    'createTree'
  )) as { sha: string };

  // 5. Create commit
  const commit = (await handle(
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [parentCommitSha],
      }),
    }),
    'createCommit'
  )) as { sha: string };

  // 6. Update ref
  await handle(
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commit.sha }),
    }),
    'updateRef'
  );

  return { commitSha: commit.sha };
};

export const listDirectory = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<{ name: string; path: string; sha: string; size: number; type: string }[]> => {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: headers(token) });
  if (res.status === 404) return [];
  const data = await handle(res, 'listDirectory');
  return Array.isArray(data) ? (data as never) : [];
};
