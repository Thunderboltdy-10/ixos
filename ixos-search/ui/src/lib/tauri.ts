import { invoke, Channel } from '@tauri-apps/api/core';
import type {
  IxosConfig,
  SearchOptions,
  SearchEvent,
  ConsentStatus,
  ModelStatus,
  DoctorReport,
  PersonalSignals,
  ActivityAction,
  ActivityEvent,
  ActivityStats,
  CoOccurrence,
  ResumptionData,
  MoveRecommendation,
  RecentFile,
  TimeRange,
  Workstream,
  WorkstreamDetail,
  WorkstreamGraph,
  WorkstreamsStats,
} from './types';

let activeSearchChannel: Channel<SearchEvent> | null = null;

function isTerminalSearchEvent(event: SearchEvent): boolean {
  return event.type === 'complete' || event.type === 'cancelled' || event.type === 'error';
}

/**
 * Start a progressive search using Tauri v2 Channel API.
 *
 * The Channel provides scoped, ordered delivery tied to this specific
 * command invocation — no missed events, no global listener lifecycle issues.
 */
export async function searchProgressive(
  query: string,
  directory: string,
  options: SearchOptions = {},
  onEvent?: (event: SearchEvent) => void,
): Promise<void> {
  if (activeSearchChannel) {
    activeSearchChannel.onmessage = () => {};
  }

  const channel = new Channel<SearchEvent>();
  activeSearchChannel = channel;
  channel.onmessage = (event) => {
    onEvent?.(event);
    if (activeSearchChannel === channel && isTerminalSearchEvent(event)) {
      activeSearchChannel = null;
    }
  };

  try {
    await invoke('search_progressive', { query, directory, options, channel });
  } catch (error) {
    if (activeSearchChannel === channel) {
      activeSearchChannel = null;
    }
    throw error;
  }
}

/**
 * Cancel the current search
 */
export async function cancelSearch(): Promise<void> {
  if (activeSearchChannel) {
    activeSearchChannel.onmessage = () => {};
    activeSearchChannel = null;
  }
  await invoke('cancel_search');
}

/**
 * Get current configuration
 */
export async function getConfig(): Promise<IxosConfig> {
  return await invoke('get_config');
}

/**
 * Update configuration
 */
export async function updateConfig(config: IxosConfig): Promise<void> {
  await invoke('update_config', { config });
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  await invoke('reset_config');
}

/**
 * Get consent status
 */
export async function getConsentStatus(): Promise<ConsentStatus> {
  return await invoke('get_consent_status');
}

/**
 * Grant consent
 */
export async function grantConsent(): Promise<void> {
  await invoke('grant_consent');
}

/**
 * Withdraw consent
 */
export async function withdrawConsent(): Promise<void> {
  await invoke('withdraw_consent');
}

/**
 * Show the overlay window
 */
export async function showOverlay(): Promise<void> {
  await invoke('show_overlay');
}

/**
 * Hide the overlay window
 */
export async function hideOverlay(): Promise<void> {
  await invoke('hide_overlay');
}

/**
 * Open a file with default application
 */
export async function openFile(path: string): Promise<void> {
  await invoke('open_file', { path });
}

/**
 * Reveal a file in the system file explorer
 */
export async function revealInExplorer(path: string): Promise<void> {
  await invoke('reveal_in_explorer', { path });
}

/**
 * Emergency clear all sensitive data (journalist mode)
 */
export async function emergencyClear(): Promise<void> {
  await invoke('emergency_clear');
  // Also clear encrypted local data
  await invoke('clear_all_encrypted_files');
}

/**
 * Get the default search directory
 */
export async function getDefaultSearchDirectory(): Promise<string> {
  return await invoke('get_default_search_directory');
}

/**
 * Select a directory using the system file picker
 */
export async function selectDirectory(): Promise<string | null> {
  return await invoke('select_directory');
}

/**
 * Get embedding model availability and load status.
 */
export async function getModelStatus(): Promise<ModelStatus> {
  return await invoke('get_model_status');
}

/**
 * Get cache stats for a directory.
 */
export async function getCacheStats(
  directory: string,
): Promise<{ backendType: string; cachedFiles: number; totalSizeBytes: number; available: boolean; cacheMode: string }> {
  return await invoke('get_cache_stats', { directory });
}

/**
 * Clear local embedding cache for a directory, or globally when directory is omitted.
 */
export async function cacheClear(directory?: string | null): Promise<number> {
  return await invoke('cache_clear', { directory: directory ?? null });
}


/**
 * Run backend doctor checks.
 */
export async function runDoctor(verbose = false): Promise<DoctorReport> {
  return await invoke('run_doctor', { verbose });
}

/**
 * Get keyboard shortcut configuration
 */
export async function getShortcutConfig(): Promise<import('./types').ShortcutConfig> {
  return await invoke('get_shortcut_config');
}

/**
 * Set keyboard shortcut configuration
 */
export async function setShortcutConfig(config: import('./types').ShortcutConfig): Promise<void> {
  await invoke('set_shortcut_config', { config });
}

/**
 * Personal ranking controls.
 */
export async function pinFile(path: string): Promise<void> {
  await invoke('pin_file', { path });
}

export async function unpinFile(path: string): Promise<void> {
  await invoke('unpin_file', { path });
}

export async function ignoreFile(path: string): Promise<void> {
  await invoke('ignore_file', { path });
}

export async function unignoreFile(path: string): Promise<void> {
  await invoke('unignore_file', { path });
}

export async function markNotRelevant(path: string): Promise<void> {
  await invoke('mark_not_relevant', { path });
}

export async function getPersonalSignals(path: string): Promise<PersonalSignals | null> {
  return await invoke('get_personal_signals', { path });
}

export async function resetLearning(directory: string): Promise<number> {
  return await invoke('reset_learning', { directory });
}

/**
 * Open an HTTP(S) link in the system browser
 */
export async function openExternalUrl(url: string, title?: string, label?: string): Promise<void> {
  await invoke('open_external_url', { url, title, label });
}

// ============================================================================
// Phase 2: Activity Ledger
// ============================================================================

/**
 * Log an activity event
 */
export async function logActivity(
  filePath: string,
  actionType: ActivityAction,
  query?: string,
  metadata?: Record<string, string>
): Promise<void> {
  await invoke('log_activity', {
    request: { filePath, actionType, query, metadata }
  });
}

/**
 * Log that a result was shown in ranked search results
 */
export async function logResultShown(filePath: string, query: string): Promise<void> {
  await invoke('log_result_shown', { filePath, query });
}

/**
 * Get activity events
 */
export async function getActivity(
  timeRange?: TimeRange,
  actionTypes?: ActivityAction[],
  limit?: number
): Promise<ActivityEvent[]> {
  return await invoke('get_activity', {
    request: { timeRange, actionTypes, limit }
  });
}

/**
 * Get co-occurrence data for related files
 */
export async function getCoOccurrence(
  filePath: string,
  windowMins?: number
): Promise<CoOccurrence[]> {
  return await invoke('get_co_occurrence', { filePath, windowMins });
}

/**
 * Get recently touched files (today)
 */
export async function getRecentlyTouched(limit?: number): Promise<RecentFile[]> {
  const payload = await invoke<ResumptionData>('get_recently_touched', { limit });
  return payload.recentlyTouched;
}

/**
 * Get ranked resumption data for the Today tab.
 */
export async function getResumptionData(
  limit?: number,
  suggestionLimit?: number
): Promise<ResumptionData> {
  return await invoke('get_recently_touched', { limit, suggestionLimit });
}

/**
 * Get local move recommendations inferred from repeated search/open behavior.
 */
export async function getMoveRecommendations(
  limit?: number,
  minEvidence?: number
): Promise<MoveRecommendation[]> {
  return await invoke('get_move_recommendations', { limit, minEvidence });
}

/**
 * Clear activity data (GDPR deletion)
 */
export async function clearActivity(timeRange?: TimeRange): Promise<void> {
  await invoke('clear_activity', { timeRange });
}

/**
 * Get activity statistics
 */
export async function getActivityStats(): Promise<ActivityStats> {
  return await invoke('get_activity_stats');
}

/**
 * Save activity ledger to local encrypted storage
 */
export async function saveActivityLedger(): Promise<void> {
  await invoke('save_activity_ledger');
}

/**
 * Load activity ledger from local encrypted storage
 */
export async function loadActivityLedger(): Promise<ActivityStats> {
  return await invoke('load_activity_ledger');
}

// ============================================================================
// Phase 2: Workstreams
// ============================================================================

/**
 * List all workstreams
 */
export async function listWorkstreams(
  limit?: number,
  offset?: number
): Promise<Workstream[]> {
  return await invoke('list_workstreams', { limit, offset });
}

/**
 * Get a specific workstream
 */
export async function getWorkstream(id: string): Promise<Workstream> {
  const detail = await invoke<WorkstreamDetail>('get_workstream', { id });
  return detail.workstream;
}

/**
 * Get a workstream plus its local relationship graph.
 */
export async function getWorkstreamDetail(
  id: string,
  graphLimit?: number
): Promise<WorkstreamDetail> {
  return await invoke('get_workstream', { id, graphLimit });
}

/**
 * Get the local relationship graph around a workstream.
 */
export async function getWorkstreamGraph(
  id: string,
  graphLimit?: number
): Promise<WorkstreamGraph> {
  const detail = await invoke<WorkstreamDetail>('get_workstream', { id, graphLimit });
  return detail.graph;
}

/**
 * Create a new workstream
 */
export async function createWorkstream(
  name: string,
  description?: string,
  eventIds?: string[]
): Promise<Workstream> {
  return await invoke('create_workstream', {
    request: { name, description, eventIds }
  });
}

/**
 * Rename a workstream
 */
export async function renameWorkstream(id: string, newName: string): Promise<boolean> {
  return await invoke('rename_workstream', { id, newName });
}

/**
 * Merge workstreams
 */
export async function mergeWorkstreams(ids: string[]): Promise<string | null> {
  return await invoke('merge_workstreams', { ids });
}

/**
 * Delete a workstream
 */
export async function deleteWorkstream(id: string): Promise<boolean> {
  return await invoke('delete_workstream', { id });
}

/**
 * Re-cluster workstreams from activity
 */
export async function reclusterWorkstreams(gapThresholdMins?: number): Promise<number> {
  return await invoke('recluster_workstreams', { gapThresholdMins });
}

/**
 * Pin or unpin a workstream
 */
export async function pinWorkstream(id: string, pinned: boolean): Promise<boolean> {
  return await invoke('pin_workstream', { id, pinned });
}

/**
 * Get workstreams statistics
 */
export async function getWorkstreamsStats(): Promise<WorkstreamsStats> {
  return await invoke('get_workstreams_stats');
}

/**
 * Save workstreams to local encrypted storage
 */
export async function saveWorkstreams(): Promise<void> {
  await invoke('save_workstreams');
}

/**
 * Load workstreams from local encrypted storage
 */
export async function loadWorkstreams(): Promise<WorkstreamsStats> {
  return await invoke('load_workstreams');
}
