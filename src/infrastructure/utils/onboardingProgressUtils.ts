import type { Phase, Step } from '../models/onboardingProgress';

/** Steps shown as "Coming soon" in the UI — do not block phase progression */
export const COMING_SOON_STEP_IDS = new Set([2, 6]);

export function isActiveStep(step: Step): boolean {
  return !step.disabled && !COMING_SOON_STEP_IDS.has(step.id);
}

export function applyComingSoonFlags(phases: Phase[]): void {
  for (const phase of phases) {
    for (const step of phase.steps) {
      if (COMING_SOON_STEP_IDS.has(step.id)) {
        step.disabled = true;
        if (step.status === 'in_progress') {
          step.status = 'pending';
        }
      }
    }
  }
}

export function isPhaseComplete(phase: Phase): boolean {
  if (phase.id === 2) {
    // Phase 2 only requires Gigs / Telephony / Contacts (3, 4, 5).
    const requiredStepIds = [3, 4, 5];
    return requiredStepIds.every(
      (reqId) => phase.steps.find((s) => s.id === reqId)?.status === 'completed'
    );
  }

  const activeSteps = phase.steps.filter(isActiveStep);
  if (activeSteps.length === 0) return true;
  return activeSteps.every((s) => s.status === 'completed');
}

export function getDefaultPhases(): Phase[] {
  return [
    {
      id: 1,
      status: 'in_progress',
      steps: [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending', disabled: true },
      ],
    },
    {
      id: 2,
      status: 'pending',
      steps: [
        { id: 3, status: 'pending' },
        { id: 4, status: 'pending' },
        { id: 5, status: 'pending' },
        { id: 6, status: 'pending', disabled: true }, // Reporting Setup — coming soon
      ],
    },
    {
      id: 3,
      status: 'pending',
      steps: [
        { id: 7, status: 'pending' },   // Knowledge Base
        { id: 8, status: 'pending' },   // E-learning / REP Onboarding
        { id: 9, status: 'pending' },   // Call Script
        { id: 10, status: 'pending' },  // Session Planning
      ],
    },
    {
      id: 4,
      status: 'pending',
      steps: [
        { id: 11, status: 'pending' },
        { id: 12, status: 'pending' },
        { id: 13, status: 'pending' },
      ],
    },
  ];
}

/**
 * Step ID remapping from the old layout to the new one.
 *
 * Old → New
 *   6 (Call Script, was in phase 2 or 3) → 9
 *   8 (Knowledge Base)                   → 7
 *   9 (REP Onboarding)                   → 8
 *   7 (Reporting, disabled, now removed) → removed
 */
const STEP_ID_REMAP: Record<number, number | null> = {
  6: 9,
  7: null, // Reporting step removed
  8: 7,
  9: 8,
};

/**
 * Migrate an existing onboarding document to the new step structure:
 *  - Phase 2: remove Reporting (old 7) step; keep only 3, 4, 5
 *  - Phase 3: steps become 7 (KB), 8 (REP Onboarding), 9 (Call Script), 10
 *  - completedSteps remapped accordingly
 *
 * Returns true when anything was modified.
 */
export function migrateToNewStepStructure(
  phases: Phase[],
  completedSteps: number[]
): { modified: boolean; newCompletedSteps: number[] } {
  let modified = false;

  // ── Phase 2: drop old Reporting (id 7) and old Call Script (id 6) ────────
  // Then ensure the new Reporting step (id 6, disabled) is present.
  const phase2 = phases.find((p) => p.id === 2);
  if (phase2) {
    const before = phase2.steps.length;
    // Remove legacy step 7 (old Reporting key) and any old Call Script step 6
    phase2.steps = phase2.steps.filter((s) => s.id !== 7);
    // Remove old Call Script step 6 only if it hasn't been converted yet
    // (phase 3 will receive it as step 9)
    const hasOldCallScriptInP2 = phase2.steps.some((s) => s.id === 6);
    if (hasOldCallScriptInP2) {
      phase2.steps = phase2.steps.filter((s) => s.id !== 6);
    }
    // Ensure new Reporting step 6 (disabled) exists in phase 2
    if (!phase2.steps.some((s) => s.id === 6)) {
      phase2.steps.push({ id: 6, status: 'pending', disabled: true });
      modified = true;
    }
    if (phase2.steps.length !== before) modified = true;
  }

  // ── Phase 3: rebuild with new IDs ─────────────────────────────────────────
  // phaseStructureChanged tracks whether phase 3 was in the old layout and
  // required rebuilding. It gates the completedSteps remap below: once the
  // phase structure is already [7,8,9,10] the completedSteps are also already
  // in new-ID space — re-running the remap would corrupt them (e.g. new step 7
  // would be treated as old step 7/Reporting and dropped).
  let phaseStructureChanged = false;
  const phase3 = phases.find((p) => p.id === 3);
  if (phase3) {
    const oldStepMap = new Map<number, Step>(phase3.steps.map((s) => [s.id, s]));

    // Old Call Script was step 6 — look only in phase 3 old data (not phase 2's new Reporting step)
    const strayStep6 = oldStepMap.get(6);

    const newSteps: Step[] = [
      // 7 = KB (was 8) — preserve status, strip any stale disabled flag
      oldStepMap.has(8)
        ? { ...oldStepMap.get(8)!, id: 7, disabled: undefined }
        : { id: 7, status: 'pending' },
      // 8 = REP Onboarding (was 9) — strip disabled: old step 9 may have had disabled:true
      oldStepMap.has(9)
        ? { ...oldStepMap.get(9)!, id: 8, disabled: undefined }
        : { id: 8, status: 'pending' },
      // 9 = Call Script — always active, never inherit disabled from old Reporting step 6
      strayStep6
        ? { ...strayStep6, id: 9, disabled: undefined }
        : { id: 9, status: 'pending' },
      // 10 = Session Planning (unchanged)
      oldStepMap.has(10)
        ? oldStepMap.get(10)!
        : { id: 10, status: 'pending' },
    ];

    const changed =
      JSON.stringify(phase3.steps.map((s) => s.id)) !==
      JSON.stringify(newSteps.map((s) => s.id));
    if (changed) {
      phase3.steps = newSteps;
      phaseStructureChanged = true;
      modified = true;
    }
  }

  // ── Remap completedSteps ──────────────────────────────────────────────────
  // Only remap if the phase structure was actually in the old layout.
  // If it was already migrated, completedSteps IDs are already in new-ID space
  // and re-running the remap would silently corrupt them.
  if (phaseStructureChanged) {
    const newCompleted: number[] = [];
    let completedModified = false;
    for (const id of completedSteps) {
      if (id in STEP_ID_REMAP) {
        completedModified = true;
        const mapped = STEP_ID_REMAP[id];
        if (mapped !== null) newCompleted.push(mapped);
      } else {
        newCompleted.push(id);
      }
    }
    if (completedModified) modified = true;

    return { modified, newCompletedSteps: completedModified ? newCompleted : completedSteps };
  }

  return { modified, newCompletedSteps: completedSteps };
}

/** @deprecated use migrateToNewStepStructure */
export function migrateCallScriptToPhase3(phases: Phase[]): boolean {
  const { modified } = migrateToNewStepStructure(phases, []);
  return modified;
}

/** After step 1 is completed: phase 1 done, unlock phase 2 / step 3 */
export function advanceAfterProfileCreated(phases: Phase[]): void {
  applyComingSoonFlags(phases);

  const phase1 = phases.find((p) => p.id === 1);
  const phase2 = phases.find((p) => p.id === 2);
  if (!phase1 || !phase2) return;

  const step1 = phase1.steps.find((s) => s.id === 1);
  if (step1) {
    step1.status = 'completed';
    step1.completedAt = step1.completedAt ?? new Date();
  }

  if (isPhaseComplete(phase1)) {
    phase1.status = 'completed';
    phase2.status = 'in_progress';
    const step3 = phase2.steps.find((s) => s.id === 3);
    if (step3 && step3.status === 'pending') {
      step3.status = 'in_progress';
    }
  }
}
