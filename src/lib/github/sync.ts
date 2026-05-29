import { Base64 } from 'js-base64';
import { Plan, Session } from '../types';
import {
  BlobRef,
  createCommitWithFiles,
  createRepo,
  getFile,
  getRepo,
  getUser,
  listDirectory,
  putFile,
} from './api';
import { DEFAULT_REPO_NAME, USER_AGENT } from './config';
import { TokenInfo } from './auth';

/**
 * Repo layout — multi-scheda, single branch.
 *
 *   vibe-gym-data/
 *   ├── README.md
 *   ├── active.json              { "scheda": "<plan.id>" }
 *   ├── schede/
 *   │   ├── <plan.id>/
 *   │   │   ├── plan.json        full Plan, sessions stripped
 *   │   │   ├── index.json       quick summary of sessions
 *   │   │   └── sessions/<sessionId>.json
 *   │   └── ...
 */

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
  htmlUrl: string;
}

export interface ActiveDoc {
  scheda: string | null;
}

const README = `# Vibe Gym — Dati allenamento

Questa repository è gestita automaticamente dall'app **Vibe Gym**.

- \`active.json\` — punta alla scheda attualmente in uso.
- \`schede/<slug>/plan.json\` — la scheda (formato v2, valori tipizzati).
- \`schede/<slug>/sessions/<id>.json\` — una sessione completata per file.
- \`schede/<slug>/index.json\` — indice rapido delle sessioni.

Niente branch per scheda: tutto su \`main\`, organizzato in cartelle.
Puoi clonare il repo, modificare i file, fare commit dal terminale:
al prossimo avvio l'app scarica le modifiche.
`;

/* ============================================================
 *  Setup — find or create the data repo
 * ============================================================ */

export const ensureRepo = async (
  token: TokenInfo,
  name = DEFAULT_REPO_NAME,
  privateRepo = true
): Promise<RepoInfo> => {
  const owner = token.login ?? (await getUser(token.token)).login;

  const existing = await getRepo(token.token, owner, name);
  if (existing) {
    return {
      owner,
      repo: existing.name,
      branch: existing.default_branch,
      htmlUrl: existing.html_url,
    };
  }

  const created = await createRepo(token.token, {
    name,
    description: 'Scheda e storico allenamenti — gestiti da Vibe Gym',
    privateRepo,
    autoInit: true,
  });

  // Replace the default README with ours
  try {
    const rdm = await getFile(token.token, owner, created.name, 'README.md', created.default_branch);
    await putFile(
      token.token,
      owner,
      created.name,
      'README.md',
      created.default_branch,
      'chore: setup Vibe Gym data repo',
      Base64.encode(README),
      rdm?.sha
    );
  } catch {
    /* non-fatal */
  }

  return {
    owner,
    repo: created.name,
    branch: created.default_branch,
    htmlUrl: created.html_url,
  };
};

/* ============================================================
 *  Paths
 * ============================================================ */

const schedaDir = (slug: string) => `schede/${slug}`;
const planPath = (slug: string) => `${schedaDir(slug)}/plan.json`;
const indexPath = (slug: string) => `${schedaDir(slug)}/index.json`;
const sessionsDir = (slug: string) => `${schedaDir(slug)}/sessions`;
const sessionPath = (slug: string, sessionId: string) =>
  `${sessionsDir(slug)}/${sessionId}.json`;
const ACTIVE_PATH = 'active.json';

/* ============================================================
 *  Push helpers
 * ============================================================ */

const stringifyPlan = (plan: Plan): string => {
  const clone: Plan = JSON.parse(JSON.stringify(plan));
  clone.storico = []; // history lives in separate files
  return JSON.stringify(clone, null, 2) + '\n';
};

const stringifySession = (s: Session): string => JSON.stringify(s, null, 2) + '\n';

const stringifyIndex = (plan: Plan): string => {
  const items = plan.storico
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .map(s => ({
      id: s.id,
      data: s.data,
      giorno: s.giorno_nome,
      giorno_id: s.giorno_id,
      esercizi: s.esercizi.length,
      completati: s.esercizi.filter(e => e.completato).length,
    }));
  return (
    JSON.stringify(
      {
        schema_version: 2,
        scheda_id: plan.id,
        generated_at: new Date().toISOString(),
        generator: USER_AGENT,
        sessions: items,
      },
      null,
      2
    ) + '\n'
  );
};

const stringifyActive = (slug: string | null): string =>
  JSON.stringify({ scheda: slug }, null, 2) + '\n';

/* ============================================================
 *  Top-level operations
 * ============================================================ */

export interface PushOptions {
  /**
   * If true, also writes active.json pointing at this plan (used when
   * importing/switching scheda). Defaults to false for plain "save current
   * progress" syncs.
   */
  markActive?: boolean;
  /** Commit message override. */
  message?: string;
}

/**
 * Single atomic commit covering plan.json + index.json + any new session
 * files for this scheda. Existing sessions on the remote are detected and
 * skipped (we never overwrite them — each session file is immutable once
 * pushed).
 */
export const pushPlanAndSessions = async (
  token: TokenInfo,
  repo: RepoInfo,
  plan: Plan,
  opts: PushOptions = {}
): Promise<number> => {
  const slug = plan.id;
  const remoteSessionFiles = await listRemoteSessions(token, repo, slug);
  const remoteIds = new Set(remoteSessionFiles.map(s => s.replace(/\.json$/i, '')));
  const newSessions = plan.storico.filter(s => !remoteIds.has(s.id));

  const files: BlobRef[] = [
    { path: planPath(slug), content: stringifyPlan(plan) },
    { path: indexPath(slug), content: stringifyIndex(plan) },
    ...newSessions.map(s => ({ path: sessionPath(slug, s.id), content: stringifySession(s) })),
  ];

  if (opts.markActive) {
    files.push({ path: ACTIVE_PATH, content: stringifyActive(slug) });
  }

  const message =
    opts.message ??
    (newSessions.length > 0
      ? `session: ${plan.nome_scheda ?? slug} — ${newSessions.length} nuove`
      : `sync: ${plan.nome_scheda ?? slug}`);

  await createCommitWithFiles(token.token, repo.owner, repo.repo, repo.branch, message, files);
  return files.length;
};

/**
 * Mark a different scheda active (just rewrites active.json).
 */
export const setActiveScheda = async (
  token: TokenInfo,
  repo: RepoInfo,
  slug: string
): Promise<void> => {
  const existing = await getFile(token.token, repo.owner, repo.repo, ACTIVE_PATH, repo.branch);
  await putFile(
    token.token,
    repo.owner,
    repo.repo,
    ACTIVE_PATH,
    repo.branch,
    `scheda: switch to ${slug}`,
    Base64.encode(stringifyActive(slug)),
    existing?.sha
  );
};

const listRemoteSessions = async (
  token: TokenInfo,
  repo: RepoInfo,
  slug: string
): Promise<string[]> => {
  const entries = await listDirectory(
    token.token,
    repo.owner,
    repo.repo,
    sessionsDir(slug),
    repo.branch
  );
  return entries.filter(e => e.type === 'file' && e.name.endsWith('.json')).map(e => e.name);
};

/* ============================================================
 *  Pull
 * ============================================================ */

export interface PullResult {
  /** Active scheda, fully reconstructed (plan + history). null = empty repo. */
  plan: Plan | null;
  /** All scheda slugs present on the remote. */
  allScheda: string[];
}

export const pullActivePlan = async (token: TokenInfo, repo: RepoInfo): Promise<PullResult> => {
  // 1. Determine which scheda is active
  const activeFile = await getFile(token.token, repo.owner, repo.repo, ACTIVE_PATH, repo.branch);
  let activeSlug: string | null = null;
  if (activeFile) {
    try {
      const parsed = JSON.parse(decodeBase64(activeFile.content)) as ActiveDoc;
      activeSlug = parsed.scheda ?? null;
    } catch {
      activeSlug = null;
    }
  }

  // 2. Collect all schede on the remote
  const allDirs = await listDirectory(token.token, repo.owner, repo.repo, 'schede', repo.branch);
  const allScheda = allDirs.filter(e => e.type === 'dir').map(e => e.name);
  if (!activeSlug && allScheda.length === 1) activeSlug = allScheda[0];

  if (!activeSlug) return { plan: null, allScheda };

  // 3. Load the active plan
  const planFile = await getFile(token.token, repo.owner, repo.repo, planPath(activeSlug), repo.branch);
  if (!planFile) return { plan: null, allScheda };
  let plan: Plan;
  try {
    plan = JSON.parse(decodeBase64(planFile.content)) as Plan;
  } catch {
    return { plan: null, allScheda };
  }

  // 4. Load all sessions for this scheda
  const sessionNames = await listRemoteSessions(token, repo, activeSlug);
  const sessions: Session[] = [];
  for (const name of sessionNames) {
    const f = await getFile(
      token.token,
      repo.owner,
      repo.repo,
      `${sessionsDir(activeSlug)}/${name}`,
      repo.branch
    );
    if (!f) continue;
    try {
      sessions.push(JSON.parse(decodeBase64(f.content)) as Session);
    } catch {
      /* skip */
    }
  }
  sessions.sort((a, b) => a.data.localeCompare(b.data));

  return {
    plan: { ...plan, storico: sessions },
    allScheda,
  };
};

const decodeBase64 = (b64: string) => Base64.decode(b64.replace(/\n/g, ''));
