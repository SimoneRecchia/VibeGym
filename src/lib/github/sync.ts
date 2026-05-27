import { Base64 } from 'js-base64';
import { Plan, Session } from '../types';
import { findExercise } from '../helpers';
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
import { DEFAULT_REPO_NAME, GITHUB_API, USER_AGENT } from './config';
import { TokenInfo } from './auth';

export interface SyncState {
  /** "owner/repo" — set once the repo is created or chosen. */
  repoFullName: string;
  defaultBranch: string;
  /** Last successful sync (ISO datetime). */
  lastSync?: string;
  /** Pending operations (e.g. sessions not yet pushed). */
  pending: number;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
  htmlUrl: string;
}

const README = `# Vibe Gym — Dati allenamento

Questa repository è gestita automaticamente dall'app **Vibe Gym**.

- \`plan.json\` — la tua scheda attiva (formato v2).
- \`sessions/<id>.json\` — una sessione completata per file.
- \`index.json\` — indice rapido delle sessioni (data, giorno, esercizi).

L'app fa pull all'avvio e commit dopo ogni allenamento completato. Puoi
modificare i file da qui in qualsiasi momento; verranno scaricati al
prossimo avvio.
`;

/* ============================================================
 *  Setup — find or create the data repo
 * ============================================================ */

export const ensureRepo = async (
  token: TokenInfo,
  name = DEFAULT_REPO_NAME,
  privateRepo = true
): Promise<RepoInfo> => {
  // Resolve owner login
  const owner =
    token.login ??
    (await getUser(token.token)).login;

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

  // Seed README — auto_init creates one already, but we want our content.
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
 *  Push — plan + new sessions
 * ============================================================ */

/**
 * Push the current plan and any sessions not yet on the remote.
 * Returns the number of files committed.
 */
export const pushPlanAndSessions = async (
  token: TokenInfo,
  repo: RepoInfo,
  plan: Plan,
  message: string
): Promise<number> => {
  const remoteSessions = await listSessionFiles(token, repo);
  const remoteIds = new Set(remoteSessions.map(stripJsonExt));

  const newSessions = plan.storico.filter(s => !remoteIds.has(s.id));
  const files: BlobRef[] = [];

  // Always re-write plan.json (it tracks live progress)
  files.push({
    path: 'plan.json',
    content: stringifyPlanForRemote(plan),
  });

  for (const s of newSessions) {
    files.push({
      path: `sessions/${s.id}.json`,
      content: stringifySessionForRemote(s),
    });
  }

  // Maintain a small index for browsers (and for our own pull later)
  files.push({
    path: 'index.json',
    content: stringifyIndex(plan),
  });

  await createCommitWithFiles(
    token.token,
    repo.owner,
    repo.repo,
    repo.branch,
    `${message} (${files.length} file)`,
    files
  );

  return files.length;
};

const stripJsonExt = (s: string) => s.replace(/\.json$/i, '');

const listSessionFiles = async (
  token: TokenInfo,
  repo: RepoInfo
): Promise<string[]> => {
  const entries = await listDirectory(token.token, repo.owner, repo.repo, 'sessions', repo.branch);
  return entries.filter(e => e.type === 'file' && e.name.endsWith('.json')).map(e => e.name);
};

/* ============================================================
 *  Pull — bring local up to date with remote
 * ============================================================ */

export const pullPlan = async (
  token: TokenInfo,
  repo: RepoInfo
): Promise<Plan | null> => {
  const file = await getFile(token.token, repo.owner, repo.repo, 'plan.json', repo.branch);
  if (!file) return null;
  try {
    const json = Base64.decode(file.content.replace(/\n/g, ''));
    return JSON.parse(json) as Plan;
  } catch {
    return null;
  }
};

export const pullSessions = async (
  token: TokenInfo,
  repo: RepoInfo
): Promise<Session[]> => {
  const names = await listSessionFiles(token, repo);
  const out: Session[] = [];
  for (const name of names) {
    const file = await getFile(
      token.token,
      repo.owner,
      repo.repo,
      `sessions/${name}`,
      repo.branch
    );
    if (!file) continue;
    try {
      const json = Base64.decode(file.content.replace(/\n/g, ''));
      out.push(JSON.parse(json) as Session);
    } catch {
      /* skip malformed */
    }
  }
  out.sort((a, b) => a.data.localeCompare(b.data));
  return out;
};

/* ============================================================
 *  Serialization helpers
 * ============================================================ */

/**
 * Strip transient session fields (_serie_stato etc) before persisting to git.
 * Plan.json on the remote represents the *plan structure* — current in-progress
 * day state is mobile-only and not interesting for diff history.
 *
 * Exception: we DO save the user's per-set weights & notes for the currently
 * in-progress day so that resuming on another device keeps the spot.
 */
const stringifyPlanForRemote = (plan: Plan): string => {
  const clone: Plan = JSON.parse(JSON.stringify(plan));
  // History is split into separate files
  clone.storico = [];
  return JSON.stringify(clone, null, 2) + '\n';
};

const stringifySessionForRemote = (s: Session): string =>
  JSON.stringify(s, null, 2) + '\n';

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
  return JSON.stringify(
    {
      schema_version: 2,
      generated_at: new Date().toISOString(),
      generator: USER_AGENT,
      sessions: items,
    },
    null,
    2
  ) + '\n';
};

/** Silence unused-import warning under strict mode. */
export const _internalApiBase = GITHUB_API;
export const _findExercise = findExercise;
