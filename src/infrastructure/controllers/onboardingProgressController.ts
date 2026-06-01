import { Request, Response } from 'express';
import { OnboardingProgress, IOnboardingProgress, Step, Phase } from '../models/onboardingProgress';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { CompanyModel } from '../database/models/CompanyModel';
import mongoose from 'mongoose';
import {
  applyComingSoonFlags,
  getDefaultPhases,
  isActiveStep,
  isPhaseComplete,
  advanceAfterProfileCreated,
  migrateCallScriptToPhase3,
} from '../utils/onboardingProgressUtils';

export class OnboardingProgressController {
  constructor() {
    this.initializeProgress = this.initializeProgress.bind(this);
    this.ensureConsistency = this.ensureConsistency.bind(this);
    this.getProgress = this.getProgress.bind(this);
    this.updateStepProgress = this.updateStepProgress.bind(this);
    this.updateCurrentPhase = this.updateCurrentPhase.bind(this);
    this.resetProgress = this.resetProgress.bind(this);
    this.getProgressByUserId = this.getProgressByUserId.bind(this);
    this.fixCurrentPhase = this.fixCurrentPhase.bind(this);
    this.completeLastPhaseAndStep = this.completeLastPhaseAndStep.bind(this);
    this.completeStep = this.completeStep.bind(this);
  }

  // Initialiser le progrès d'onboarding pour une entreprise
  async initializeProgress(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      console.log('companyId reçu:', companyId);

      // Convertir en ObjectId
      const companyObjectId = new Types.ObjectId(companyId);
      console.log('companyObjectId:', companyObjectId.toString());

      // Vérifier si un progrès existe déjà pour cette company
      const existingProgress = await OnboardingProgress.findOne({ companyId: companyObjectId });
      console.log('Progrès existant trouvé:', existingProgress);

      if (existingProgress) {
        return res.status(400).json({ message: 'Onboarding progress already exists for this company' });
      }

      // Créer la structure initiale
      const initialProgress = new OnboardingProgress({
        companyId: companyObjectId,
        currentPhase: 1,
        completedSteps: [],
        phases: getDefaultPhases(),
      });
      applyComingSoonFlags(initialProgress.phases);

      const savedProgress = await initialProgress.save();
      console.log('Nouveau progrès sauvegardé:', savedProgress);

      res.status(201).json(savedProgress);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      res.status(500).json({ message: 'Error initializing onboarding progress', error });
    }
  }

  // Synchroniser et assurer la cohérence des données d'onboarding
  async ensureConsistency(progress: any): Promise<boolean> {
    let modified = false;

    // 0. Migration : "Call Script" (id 6) a été déplacé de la phase 2
    //    vers la phase 3 (après E-learning id 9, avant Session Planning id 10).
    //    Pour les anciens enregistrements, on déplace le step 6 sans perdre
    //    son statut.
    const callScriptMigrated = migrateCallScriptToPhase3(progress.phases);
    if (callScriptMigrated) modified = true;

    // 1. Appliquer les flags coming soon (step 2 et 7 désactivés et mis à pending si in_progress)
    applyComingSoonFlags(progress.phases);

    // 2. Synchroniser completedSteps avec l'état réel des steps dans les phases
    const computedCompletedSteps: number[] = [];
    for (const phase of progress.phases) {
      for (const step of phase.steps) {
        if (step.status === 'completed' && !computedCompletedSteps.includes(step.id)) {
          computedCompletedSteps.push(step.id);
        }
      }
    }

    // Fusionner avec completedSteps existant
    for (const stepId of progress.completedSteps) {
      if (!computedCompletedSteps.includes(stepId)) {
        // Si le step était marqué completed dans la liste mais pas dans la phase,
        // le mettre à completed dans la phase correspondante
        const phase = progress.phases.find((p: Phase) => p.steps.some((s: Step) => s.id === stepId));
        if (phase) {
          const step = phase.steps.find((s: Step) => s.id === stepId);
          if (step && step.status !== 'completed') {
            step.status = 'completed';
            step.completedAt = step.completedAt || new Date();
            modified = true;
          }
        }
        computedCompletedSteps.push(stepId);
      }
    }

    const sortedComputed = [...computedCompletedSteps].sort((a, b) => a - b);
    const sortedCurrent = [...progress.completedSteps].sort((a, b) => a - b);
    if (JSON.stringify(sortedComputed) !== JSON.stringify(sortedCurrent)) {
      progress.completedSteps = computedCompletedSteps;
      modified = true;
    }

    // 3. Avancer après la création du profil (Step 1)
    const phase1 = progress.phases.find((p: Phase) => p.id === 1);
    const step1Done = progress.completedSteps.includes(1);
    if (step1Done && phase1) {
      const step1 = phase1.steps.find((s: Step) => s.id === 1);
      if (step1 && step1.status !== 'completed') {
        step1.status = 'completed';
        step1.completedAt = step1.completedAt || new Date();
        modified = true;
      }

      if (phase1.status !== 'completed' || progress.currentPhase < 2) {
        advanceAfterProfileCreated(progress.phases);
        progress.currentPhase = Math.max(progress.currentPhase, 2);
        modified = true;
      }
    }

    // 4. Mettre à jour l'état de chaque phase et débloquer les suivantes si nécessaires
    for (let i = 0; i < progress.phases.length; i++) {
      const phase = progress.phases[i];
      const nextPhase = progress.phases[i + 1];

      const allStepsCompleted = isPhaseComplete(phase);
      const activeSteps = phase.steps.filter(isActiveStep);

      let targetStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
      
      // Déterminer le statut cible de la phase
      if (allStepsCompleted) {
        targetStatus = 'completed';
      } else if (i === 0 || (progress.phases[i - 1] && progress.phases[i - 1].status === 'completed')) {
        // La phase est accessible car la précédente est complétée
        targetStatus = 'in_progress';
      } else if (activeSteps.some((s: Step) => s.status === 'completed' || s.status === 'in_progress')) {
        targetStatus = 'in_progress';
      }

      if (phase.status !== targetStatus) {
        phase.status = targetStatus;
        modified = true;
      }

      // Si la phase est complétée, débloquer la suivante
      if (targetStatus === 'completed' && nextPhase) {
        if (nextPhase.status === 'pending') {
          nextPhase.status = 'in_progress';
          modified = true;
        }
        // Mettre le premier step actif de la phase suivante en "in_progress" si tout est pending
        const firstActivePendingStep = nextPhase.steps.find((s: Step) => isActiveStep(s) && s.status === 'pending');
        const hasAnyStepInProgressOrCompleted = nextPhase.steps.some((s: Step) => s.status === 'in_progress' || s.status === 'completed');
        if (firstActivePendingStep && !hasAnyStepInProgressOrCompleted) {
          firstActivePendingStep.status = 'in_progress';
          modified = true;
        }
      }
    }

    // 5. Calculer la phase courante active
    const currentActivePhase = progress.phases.find((p: Phase) => p.status === 'in_progress');
    if (currentActivePhase && progress.currentPhase !== currentActivePhase.id) {
      progress.currentPhase = currentActivePhase.id;
      modified = true;
    }

    if (modified) {
      progress.markModified('phases');
      progress.markModified('completedSteps');
      await progress.save();
      console.log('✅ Onboarding progress consistency saved to DB');
    }

    return modified;
  }

  // Obtenir le progrès d'onboarding d'une entreprise
  async getProgress(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      console.log('companyId reçu:', companyId);

      // Convertir en ObjectId pour la requête MongoDB
      const companyObjectId = new Types.ObjectId(companyId);
      console.log('companyObjectId:', companyObjectId.toString());

      const progress = await OnboardingProgress.findOne({ companyId: companyObjectId });

      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      await this.ensureConsistency(progress);

      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching onboarding progress', error });
    }
  }

  // Mettre à jour le progrès d'une étape
  async updateStepProgress(req: Request, res: Response) {
    try {
      const { companyId, phaseId, stepId } = req.params;
      const { status } = req.body;

      const companyObjectId = new Types.ObjectId(companyId);
      let progress = await OnboardingProgress.findOne({ companyId: companyObjectId });
      
      if (!progress) {
        console.log(`⚠️  [Onboarding] Progress not found for company ${companyId}. Initializing...`);
        progress = new OnboardingProgress({
          companyId: companyObjectId,
          currentPhase: 1,
          completedSteps: [],
          phases: getDefaultPhases(),
        });
        await this.ensureConsistency(progress);
      }

      await this.ensureConsistency(progress);

      // Mettre à jour le statut de l'étape
      const phase = progress.phases.find((p: Phase) => p.id === parseInt(phaseId));
      if (!phase) {
        return res.status(404).json({ message: 'Phase not found' });
      }

      const step = phase.steps.find((s: Step) => s.id === parseInt(stepId));
      if (!step) {
        return res.status(404).json({ message: 'Step not found' });
      }

      if (parseInt(phaseId) > 1) {
        const previousPhases = progress.phases.filter((p: Phase) => p.id < parseInt(phaseId));
        const incompletePreviousPhases = previousPhases.filter((p: Phase) => !isPhaseComplete(p));

        if (incompletePreviousPhases.length > 0) {
          return res.status(400).json({
            message: 'Cannot modify steps in phase ' + phaseId + ' because previous phases are not completed',
            incompletePhases: incompletePreviousPhases.map((p: Phase) => p.id)
          });
        }
      }

      step.status = status;

      // Gérer l'ajout/retrait du step de la liste completedSteps
      if (status === 'completed') {
        step.completedAt = new Date();
        if (!progress.completedSteps.includes(parseInt(stepId))) {
          progress.completedSteps.push(parseInt(stepId));
        }

        // Trouver le prochain step disponible dans la phase courante
        const currentStepIndex = phase.steps.findIndex((s: Step) => s.id === parseInt(stepId));
        const nextStep = phase.steps
          .slice(currentStepIndex + 1)
          .find((s: Step) => isActiveStep(s) && s.status !== 'completed');

        if (nextStep) {
          nextStep.status = 'in_progress';
        } else if (isPhaseComplete(phase)) {
          phase.status = 'completed';
          const nextPhase = progress.phases.find((p: Phase) => p.id > phase.id);
          if (nextPhase) {
            nextPhase.status = 'in_progress';
            progress.currentPhase = nextPhase.id;
            const firstAvailableStep = nextPhase.steps.find(
              (s: Step) => isActiveStep(s) && s.status !== 'completed'
            );
            if (firstAvailableStep) {
              firstAvailableStep.status = 'in_progress';
            }
          }
        }
      } else {
        // Si le status n'est pas 'completed', retirer le step de completedSteps
        const stepIndex = progress.completedSteps.indexOf(parseInt(stepId));
        if (stepIndex > -1) {
          progress.completedSteps.splice(stepIndex, 1);
        }
        // Réinitialiser completedAt si le step n'est plus complété
        step.completedAt = undefined;
      }

      if (parseInt(stepId) === 1 && status === 'completed') {
        advanceAfterProfileCreated(progress.phases);
        if (!progress.completedSteps.includes(1)) {
          progress.completedSteps.push(1);
        }
        progress.currentPhase = 2;
      }

      // Lancer ensureConsistency pour propager les changements, recalibrer les statuts
      await this.ensureConsistency(progress);

      // S'assurer que les modifications de updateStepProgress sont bien sauvegardées
      progress.markModified('phases');
      progress.markModified('completedSteps');
      await progress.save();
      console.log('✅ Onboarding progress saved after updateStepProgress');

      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: 'Error updating step progress', error });
    }
  }

  // Compléter une étape (via query param companyId)
  async completeStep(req: Request, res: Response) {
    try {
      const { phaseId, stepId } = req.params;
      const { companyId } = req.query;

      console.log(`[Onboarding] completeStep called for phase ${phaseId}, step ${stepId}, companyId ${companyId}`);

      if (!companyId) {
        return res.status(400).json({ message: 'companyId is required in query parameters' });
      }

      // Injecter les valeurs pour réutiliser updateStepProgress
      req.params.companyId = companyId as string;
      req.body = { status: 'completed' };

      // Appeler updateStepProgress
      return this.updateStepProgress(req, res);
    } catch (error) {
      console.error('Error in completeStep:', error);
      res.status(500).json({ message: 'Error completing step', error });
    }
  }

  // Mettre à jour la phase courante
  async updateCurrentPhase(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const { phase } = req.body;
      console.log('phase reçu:', phase);
      console.log('companyId reçu:', companyId);
      const companyObjectId = new Types.ObjectId(companyId);
      const progress = await OnboardingProgress.findOne({ companyId: companyObjectId });
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      await this.ensureConsistency(progress);

      if (phase > 1) {
        const previousPhases = progress.phases.filter((p: Phase) => p.id < phase);
        const incompletePreviousPhases = previousPhases.filter((p: Phase) => !isPhaseComplete(p));

        if (incompletePreviousPhases.length > 0) {
          return res.status(400).json({
            message: 'Cannot access phase ' + phase + ' because previous phases are not completed',
            incompletePhases: incompletePreviousPhases.map((p: Phase) => p.id)
          });
        }
      }

      progress.currentPhase = phase;
      
      // Lancer ensureConsistency pour sauvegarder
      await this.ensureConsistency(progress);
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: 'Error updating current phase', error });
    }
  }

  // Réinitialiser le progrès d'onboarding
  async resetProgress(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const companyObjectId = new Types.ObjectId(companyId);
      await OnboardingProgress.findOneAndDelete({ companyId: companyObjectId });

      // Réinitialiser avec les valeurs par défaut
      const initialProgress = new OnboardingProgress({
        companyId,
        currentPhase: 1,
        completedSteps: [],
        phases: getDefaultPhases(),
      });
      applyComingSoonFlags(initialProgress.phases);

      await initialProgress.save();
      res.json(initialProgress);
    } catch (error) {
      res.status(500).json({ message: 'Error resetting onboarding progress', error });
    }
  }

  async getProgressByUserId(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      console.log('userId reçu:', userId);
      // Trouver la company associée au userId
      const company = await CompanyModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });

      if (!company) {
        return res.status(404).json({ message: 'No company found for this user' });
      }

      // Utiliser le companyId pour trouver le progrès d'onboarding
      const progress = await OnboardingProgress.findOne({
        companyId: company._id
      });

      if (!progress) {
        return res.status(404).json({ message: 'No onboarding progress found' });
      }

      await this.ensureConsistency(progress);

      res.status(200).json(progress);
    } catch (error) {
      console.error('Error getting progress by userId:', error);
      res.status(500).json({ message: 'Error retrieving onboarding progress' });
    }
  }

  // Réparer la phase courante basée sur l'état réel des phases
  async fixCurrentPhase(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      console.log('Fixing current phase for companyId:', companyId);

      const companyObjectId = new Types.ObjectId(companyId);
      const progress = await OnboardingProgress.findOne({ companyId: companyObjectId });
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      // Calculer la phase courante basée sur l'état réel
      const currentActivePhase = progress.phases.find((p: Phase) =>
        p.status === 'in_progress' ||
        (p.status === 'pending' && p.steps.some((s: Step) => s.status === 'in_progress'))
      );

      if (currentActivePhase) {
        progress.currentPhase = currentActivePhase.id;
        await progress.save();

        console.log('Current phase fixed to:', currentActivePhase.id);
        res.json({
          message: 'Current phase fixed successfully',
          progress
        });
      } else {
        res.json({
          message: 'No active phase found',
          progress
        });
      }
    } catch (error) {
      console.error('Error fixing current phase:', error);
      res.status(500).json({ message: 'Error fixing current phase', error });
    }
  }

  // Compléter automatiquement la dernière phase et le dernier step
  async completeLastPhaseAndStep(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      console.log('Completing last phase and step for companyId:', companyId);

      const companyObjectId = new Types.ObjectId(companyId);
      const progress = await OnboardingProgress.findOne({ companyId: companyObjectId });
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      // Trouver la dernière phase
      const lastPhase = progress.phases[progress.phases.length - 1];
      if (!lastPhase) {
        return res.status(404).json({ message: 'No phases found' });
      }

      // Trouver le dernier step de la dernière phase
      const lastStep = lastPhase.steps[lastPhase.steps.length - 1];
      if (!lastStep) {
        return res.status(404).json({ message: 'No steps found in last phase' });
      }

      // Marquer le dernier step comme complété
      lastStep.status = 'completed';
      lastStep.completedAt = new Date();

      // Ajouter le step à la liste des steps complétés s'il n'y est pas déjà
      if (!progress.completedSteps.includes(lastStep.id)) {
        progress.completedSteps.push(lastStep.id);
      }

      // Marquer la dernière phase comme complétée
      lastPhase.status = 'completed';

      // Mettre à jour la phase courante vers la dernière phase
      progress.currentPhase = lastPhase.id;

      await progress.save();

      console.log('Last phase and step completed successfully');
      res.json({
        message: 'Last phase and step completed successfully',
        progress
      });
    } catch (error) {
      console.error('Error completing last phase and step:', error);
      res.status(500).json({ message: 'Error completing last phase and step', error });
    }
  }
}