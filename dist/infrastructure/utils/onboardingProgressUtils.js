"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMING_SOON_STEP_IDS = void 0;
exports.isActiveStep = isActiveStep;
exports.applyComingSoonFlags = applyComingSoonFlags;
exports.isPhaseComplete = isPhaseComplete;
exports.getDefaultPhases = getDefaultPhases;
exports.migrateToNewStepStructure = migrateToNewStepStructure;
exports.migrateCallScriptToPhase3 = migrateCallScriptToPhase3;
exports.repairOutOfOrderCompletions = repairOutOfOrderCompletions;
exports.advanceAfterProfileCreated = advanceAfterProfileCreated;
/** Steps shown as "Coming soon" in the UI — do not block phase progression */
exports.COMING_SOON_STEP_IDS = new Set([2, 6]);
function isActiveStep(step) {
    return !step.disabled && !exports.COMING_SOON_STEP_IDS.has(step.id);
}
function applyComingSoonFlags(phases) {
    for (const phase of phases) {
        for (const step of phase.steps) {
            if (exports.COMING_SOON_STEP_IDS.has(step.id)) {
                step.disabled = true;
                // Disabled steps must never appear as in_progress or completed.
                if (step.status !== 'pending') {
                    step.status = 'pending';
                    step.completedAt = undefined;
                }
            }
        }
    }
}
function isPhaseComplete(phase) {
    if (phase.id === 2) {
        // Phase 2 only requires Gigs / Telephony / Contacts (3, 4, 5).
        const requiredStepIds = [3, 4, 5];
        return requiredStepIds.every((reqId) => phase.steps.find((s) => s.id === reqId)?.status === 'completed');
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
                { id: 6, status: 'pending', disabled: true }, // Reporting Setup — coming soon
            ],
        },
        {
            id: 3,
            status: 'pending',
            steps: [
                { id: 7, status: 'pending' }, // Knowledge Base
                { id: 8, status: 'pending' }, // E-learning / REP Onboarding
                { id: 9, status: 'pending' }, // Call Script
                { id: 10, status: 'pending' }, // Session Planning
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
const STEP_ID_REMAP = {
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
/**
 * Safe numeric-id accessor for Step objects — works for both plain objects
 * and Mongoose subdocuments. Mongoose adds a virtual `id` getter that returns
 * the hex string of `_id`, which would shadow our custom `id: Number` path
 * when accessed via `s.id`.  Using `s.get('id')` (Mongoose's schema-path
 * accessor) bypasses the virtual and returns the actual stored Number.
 */
function getStepNumericId(s) {
    if (s && typeof s.get === 'function')
        return s.get('id');
    return s.id;
}
function migrateToNewStepStructure(phases, completedSteps) {
    let modified = false;
    // ── Phase 2: drop old Reporting (id 7) and old Call Script (id 6) ────────
    // Then ensure the new Reporting step (id 6, disabled) is present.
    const phase2 = phases.find((p) => p.id === 2);
    if (phase2) {
        const before = phase2.steps.length;
        // Remove legacy step 7 (old Reporting key) and any old Call Script step 6
        phase2.steps = phase2.steps.filter((s) => getStepNumericId(s) !== 7);
        // Remove old Call Script step 6 only if it hasn't been converted yet
        // (phase 3 will receive it as step 9)
        const hasOldCallScriptInP2 = phase2.steps.some((s) => getStepNumericId(s) === 6);
        if (hasOldCallScriptInP2) {
            phase2.steps = phase2.steps.filter((s) => getStepNumericId(s) !== 6);
        }
        // Ensure new Reporting step 6 (disabled) exists in phase 2
        if (!phase2.steps.some((s) => getStepNumericId(s) === 6)) {
            phase2.steps.push({ id: 6, status: 'pending', disabled: true });
            modified = true;
        }
        if (phase2.steps.length !== before)
            modified = true;
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
        // Use getStepNumericId to avoid Mongoose virtual `id` getter returning hex _id
        const oldStepMap = new Map(phase3.steps.map((s) => [getStepNumericId(s), s]));
        // Old Call Script was step 6 — look only in phase 3 old data (not phase 2's new Reporting step)
        const strayStep6 = oldStepMap.get(6);
        // When spreading Mongoose subdocuments, convert to plain objects first to
        // avoid including Mongoose internals (virtuals, $__, etc.) in the new steps.
        const toPlain = (s) => s && typeof s.toObject === 'function' ? s.toObject() : { ...s };
        const newSteps = [
            // 7 = KB (was 8) — preserve status, strip any stale disabled flag
            oldStepMap.has(8)
                ? { ...toPlain(oldStepMap.get(8)), id: 7, disabled: undefined }
                : { id: 7, status: 'pending' },
            // 8 = REP Onboarding (was 9) — strip disabled: old step 9 may have had disabled:true
            oldStepMap.has(9)
                ? { ...toPlain(oldStepMap.get(9)), id: 8, disabled: undefined }
                : { id: 8, status: 'pending' },
            // 9 = Call Script — always active, never inherit disabled from old Reporting step 6
            strayStep6
                ? { ...toPlain(strayStep6), id: 9, disabled: undefined }
                : { id: 9, status: 'pending' },
            // 10 = Session Planning (unchanged) — convert to plain object to avoid
            // keeping a live Mongoose subdocument reference in a mixed array
            oldStepMap.has(10)
                ? { ...toPlain(oldStepMap.get(10)), id: 10 }
                : { id: 10, status: 'pending' },
        ];
        const currentIds = phase3.steps.map(getStepNumericId);
        const newIds = newSteps.map((s) => s.id);
        const changed = JSON.stringify(currentIds) !== JSON.stringify(newIds);
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
        const newCompleted = [];
        let completedModified = false;
        for (const id of completedSteps) {
            if (id in STEP_ID_REMAP) {
                completedModified = true;
                const mapped = STEP_ID_REMAP[id];
                if (mapped !== null)
                    newCompleted.push(mapped);
            }
            else {
                newCompleted.push(id);
            }
        }
        if (completedModified)
            modified = true;
        return { modified, newCompletedSteps: completedModified ? newCompleted : completedSteps };
    }
    return { modified, newCompletedSteps: completedSteps };
}
/** @deprecated use migrateToNewStepStructure */
function migrateCallScriptToPhase3(phases) {
    const { modified } = migrateToNewStepStructure(phases, []);
    return modified;
}
/**
 * Detect and repair steps that were incorrectly completed by the migration
 * bug (completedSteps remap running on already-migrated data).
 *
 * Rule: in Phase 3, no step with id > X should be 'completed' if step X is
 * not yet completed (sequential dependency).
 * Specifically: step 9 (Call Script) cannot be completed before step 8 (E-learning).
 *
 * Returns true if anything was corrected.
 */
function repairOutOfOrderCompletions(phases, completedSteps) {
    let modified = false;
    const newCompleted = [...completedSteps];
    const phase3 = phases.find((p) => p.id === 3);
    if (!phase3)
        return { modified, completedSteps };
    const step8 = phase3.steps.find((s) => getStepNumericId(s) === 8);
    const step9 = phase3.steps.find((s) => getStepNumericId(s) === 9);
    // If step 9 is completed but step 8 is NOT → step 9 was wrongly auto-completed
    if (step9 && step9.status === 'completed' &&
        step8 && step8.status !== 'completed') {
        step9.status = 'in_progress';
        step9.completedAt = undefined;
        const idx = newCompleted.indexOf(9);
        if (idx !== -1)
            newCompleted.splice(idx, 1);
        modified = true;
    }
    return { modified, completedSteps: newCompleted };
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
