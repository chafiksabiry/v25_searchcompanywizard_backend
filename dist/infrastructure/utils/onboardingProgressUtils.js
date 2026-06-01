"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMING_SOON_STEP_IDS = exports.LEGACY_ONBOARDING_STEP_MAP = void 0;
exports.mapLegacyStepId = mapLegacyStepId;
exports.normalizeCompletedStepIds = normalizeCompletedStepIds;
exports.isActiveStep = isActiveStep;
exports.applyComingSoonFlags = applyComingSoonFlags;
exports.isPhaseComplete = isPhaseComplete;
exports.getDefaultPhases = getDefaultPhases;
exports.migrateOnboardingStepStructure = migrateOnboardingStepStructure;
exports.migrateCallScriptToPhase3 = migrateCallScriptToPhase3;
exports.advanceAfterProfileCreated = advanceAfterProfileCreated;
/**
 * Canonical onboarding layout (2026):
 * Phase 1: 1–2 | Phase 2: 3–6 | Phase 3: 7–10 | Phase 4: 11–13
 *
 * Legacy mapping (pre-2026 reorder):
 *   7 → 6 (Reporting) | 8 → 7 (KB) | 9 → 8 (Training) | 6 → 9 (Call Script)
 */
exports.LEGACY_ONBOARDING_STEP_MAP = {
    7: 6,
    8: 7,
    9: 8,
    6: 9,
};
/** Steps shown as "Coming soon" in the UI — do not block phase progression */
exports.COMING_SOON_STEP_IDS = new Set([2]);
function mapLegacyStepId(stepId) {
    return exports.LEGACY_ONBOARDING_STEP_MAP[stepId] ?? stepId;
}
function normalizeCompletedStepIds(stepIds) {
    const normalized = new Set();
    for (const id of stepIds) {
        if (!Number.isFinite(id))
            continue;
        normalized.add(mapLegacyStepId(id));
    }
    return [...normalized].sort((a, b) => a - b);
}
function isActiveStep(step) {
    return !step.disabled && !exports.COMING_SOON_STEP_IDS.has(step.id);
}
function applyComingSoonFlags(phases) {
    for (const phase of phases) {
        for (const step of phase.steps) {
            if (exports.COMING_SOON_STEP_IDS.has(step.id)) {
                step.disabled = true;
                if (step.status === 'in_progress') {
                    step.status = 'pending';
                }
            }
        }
    }
}
const PHASE_2_REQUIRED_STEP_IDS = [3, 4, 5, 6];
const PHASE_3_STEP_ORDER = [7, 8, 9, 10];
function isPhaseComplete(phase) {
    if (phase.id === 2) {
        return PHASE_2_REQUIRED_STEP_IDS.every((reqId) => phase.steps.find((s) => s.id === reqId)?.status === 'completed');
    }
    const activeSteps = phase.steps.filter(isActiveStep);
    if (activeSteps.length === 0)
        return true;
    return activeSteps.every((s) => s.status === 'completed');
}
function getDefaultPhases() {
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
            ],
        },
        {
            id: 3,
            status: 'pending',
            steps: [
                { id: 7, status: 'pending' },
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
function phaseStepSignature(phase) {
    if (!phase)
        return '';
    return phase.steps.map((s) => s.id).join(',');
}
function needsStructureMigration(phases) {
    const phase2 = phases.find((p) => p.id === 2);
    const phase3 = phases.find((p) => p.id === 3);
    if (!phase2 || !phase3)
        return true;
    if (phaseStepSignature(phase2) !== '3,4,5,6')
        return true;
    if (phaseStepSignature(phase3) !== PHASE_3_STEP_ORDER.join(','))
        return true;
    return false;
}
function mergeStepState(target, source) {
    const rank = (s) => s === 'completed' ? 3 : s === 'in_progress' ? 2 : 1;
    if (rank(source.status) > rank(target.status)) {
        target.status = source.status;
        target.completedAt = source.completedAt;
    }
    else if (source.status === 'completed' && !target.completedAt) {
        target.completedAt = source.completedAt;
    }
}
/**
 * Rebuild phases to the canonical 2026 step IDs while preserving statuses.
 * Also normalizes completedSteps. Returns true when the document changed.
 */
function migrateOnboardingStepStructure(progress) {
    let modified = false;
    const normalizedCompleted = normalizeCompletedStepIds(progress.completedSteps);
    const sortedBefore = [...progress.completedSteps].sort((a, b) => a - b);
    const sortedAfter = [...normalizedCompleted];
    if (JSON.stringify(sortedBefore) !== JSON.stringify(sortedAfter)) {
        progress.completedSteps = normalizedCompleted;
        modified = true;
    }
    if (!needsStructureMigration(progress.phases)) {
        return modified;
    }
    const stepByCanonicalId = new Map();
    for (const phase of progress.phases) {
        for (const step of phase.steps) {
            const canonicalId = mapLegacyStepId(step.id);
            const existing = stepByCanonicalId.get(canonicalId);
            if (!existing) {
                stepByCanonicalId.set(canonicalId, {
                    id: canonicalId,
                    status: step.status,
                    completedAt: step.completedAt,
                    disabled: step.disabled,
                });
            }
            else {
                mergeStepState(existing, step);
            }
            if (step.status === 'completed' && !progress.completedSteps.includes(canonicalId)) {
                progress.completedSteps.push(canonicalId);
                modified = true;
            }
        }
    }
    progress.completedSteps = normalizeCompletedStepIds(progress.completedSteps);
    const newPhases = getDefaultPhases();
    for (const phase of newPhases) {
        for (const step of phase.steps) {
            const saved = stepByCanonicalId.get(step.id);
            if (saved) {
                step.status = saved.status;
                step.completedAt = saved.completedAt;
                if (saved.disabled && exports.COMING_SOON_STEP_IDS.has(step.id)) {
                    step.disabled = true;
                }
            }
        }
    }
    applyComingSoonFlags(newPhases);
    progress.phases = newPhases;
    return true;
}
/**
 * @deprecated Use migrateOnboardingStepStructure — kept for callers that only moved call script.
 */
function migrateCallScriptToPhase3(phases) {
    return migrateOnboardingStepStructure({ phases, completedSteps: [] });
}
/** After step 1 is completed: phase 1 done, unlock phase 2 / step 3 */
function advanceAfterProfileCreated(phases) {
    applyComingSoonFlags(phases);
    const phase1 = phases.find((p) => p.id === 1);
    const phase2 = phases.find((p) => p.id === 2);
    if (!phase1 || !phase2)
        return;
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
