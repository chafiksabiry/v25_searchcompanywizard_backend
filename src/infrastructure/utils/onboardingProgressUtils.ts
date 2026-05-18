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
    const requiredStepIds = [3, 4, 5, 6];
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
        { id: 6, status: 'pending' },
        { id: 7, status: 'pending', disabled: true },
      ],
    },
    {
      id: 3,
      status: 'pending',
      steps: [
        { id: 8, status: 'pending' },
        { id: 9, status: 'pending' },
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
