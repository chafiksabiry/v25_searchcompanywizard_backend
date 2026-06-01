import type { Phase, Step } from '../models/onboardingProgress';

/** Steps shown as "Coming soon" in the UI — do not block phase progression */
export const COMING_SOON_STEP_IDS = new Set([2, 7]);

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
    // Call Script (id 6) moved to phase 3 between Rep Onboarding (9) and
    // Session Planning (10). Phase 2 now only requires Gigs/Telephony/Contacts.
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
        { id: 7, status: 'pending', disabled: true },
      ],
    },
    {
      id: 3,
      status: 'pending',
      steps: [
        { id: 8, status: 'pending' },
        { id: 9, status: 'pending' },
        // Call Script moved here, right after Rep Onboarding (id 9) and
        // before Session Planning (id 10).
        { id: 6, status: 'pending' },
        { id: 10, status: 'pending' },
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
 * Move step 6 ("Call Script") from phase 2 to phase 3 (after step 9,
 * before step 10) for older onboarding documents created before the
 * step was re-ordered. Returns true when the document was modified.
 */
export function migrateCallScriptToPhase3(phases: Phase[]): boolean {
  const phase2 = phases.find((p) => p.id === 2);
  const phase3 = phases.find((p) => p.id === 3);
  if (!phase2 || !phase3) return false;

  let modified = false;

  // Remove from phase 2 if still present
  const idx2 = phase2.steps.findIndex((s) => s.id === 6);
  let existingStep: Step | undefined;
  if (idx2 !== -1) {
    existingStep = phase2.steps.splice(idx2, 1)[0];
    modified = true;
  }

  // If phase 3 already has it (e.g. user already migrated), keep its
  // existing entry but make sure it is positioned right after id 9.
  let phase3Step = phase3.steps.find((s) => s.id === 6);
  if (!phase3Step && existingStep) {
    phase3Step = existingStep;
  }
  if (!phase3Step) return modified;

  // Ensure it appears between id 9 and id 10
  phase3.steps = phase3.steps.filter((s) => s.id !== 6);
  const insertIdx = phase3.steps.findIndex((s) => s.id === 9);
  if (insertIdx === -1) {
    phase3.steps.push(phase3Step);
  } else {
    phase3.steps.splice(insertIdx + 1, 0, phase3Step);
  }
  modified = true;
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
