import { Request, Response } from 'express';
import { OnboardingProgress, IOnboardingProgress } from '../models/onboardingProgress';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { CompanyModel } from '../database/models/CompanyModel';
import mongoose from 'mongoose';

export class OnboardingProgressController {
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
        completedSteps: [1],
        phases: [
          { 
            id: 1, 
            status: 'in_progress', 
            steps: [
              { id: 1, status: 'completed', completedAt: new Date() },
              { id: 2, status: 'pending', disabled: true },
              { id: 3, status: 'pending' }
            ]
          },
          { id: 2, status: 'pending', steps: Array.from({length: 6}, (_, i) => ({ id: i + 4, status: 'pending' })) },
          { id: 3, status: 'pending', steps: Array.from({length: 3}, (_, i) => ({ id: i + 10, status: 'pending' })) },
          { id: 4, status: 'pending', steps: [{ id: 13, status: 'pending' }] }
        ]
      });

      const savedProgress = await initialProgress.save();
      console.log('Nouveau progrès sauvegardé:', savedProgress);
      
      res.status(201).json(savedProgress);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      res.status(500).json({ message: 'Error initializing onboarding progress', error });
    }
  }

  // Obtenir le progrès d'onboarding d'une entreprise
  async getProgress(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      console.log('companyId reçu:', companyId);
      const progress = await OnboardingProgress.findOne({ companyId });
      
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

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

      const progress = await OnboardingProgress.findOne({ companyId });
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      // Mettre à jour le statut de l'étape
      const phase = progress.phases.find(p => p.id === parseInt(phaseId));
      if (!phase) {
        return res.status(404).json({ message: 'Phase not found' });
      }

      const step = phase.steps.find(s => s.id === parseInt(stepId));
      if (!step) {
        return res.status(404).json({ message: 'Step not found' });
      }

      // Validation: vérifier que toutes les phases précédentes sont complétées avant de modifier une étape
      // Cette validation empêche la modification d'étapes dans une phase si les phases précédentes ne sont pas terminées
      // Par exemple: on ne peut pas modifier les étapes de la phase 4 si les phases 1, 2 ou 3 ne sont pas complétées
      if (parseInt(phaseId) > 1) {
        // Récupérer toutes les phases avec un ID inférieur à la phase de l'étape
        const previousPhases = progress.phases.filter(p => p.id < parseInt(phaseId));
        // Filtrer pour ne garder que les phases non complétées
        const incompletePreviousPhases = previousPhases.filter(p => p.status !== 'completed');
        
        // Si des phases précédentes ne sont pas complétées, refuser la modification
        if (incompletePreviousPhases.length > 0) {
          return res.status(400).json({ 
            message: 'Cannot modify steps in phase ' + phaseId + ' because previous phases are not completed',
            incompletePhases: incompletePreviousPhases.map(p => p.id)
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
        const nextStep = phase.steps.find(s => 
          s.id > parseInt(stepId) && 
          !s.disabled && 
          s.status !== 'completed'
        );

        if (nextStep) {
          // Si un prochain step est trouvé dans la phase courante, le marquer comme 'in_progress'
          nextStep.status = 'in_progress';
        } else {
          // Si pas de prochain step dans la phase courante, chercher dans la phase suivante
          const nextPhase = progress.phases.find(p => p.id > phase.id);
          if (nextPhase) {
            const firstAvailableStep = nextPhase.steps.find(s => !s.disabled && s.status !== 'completed');
            if (firstAvailableStep) {
              // Ne pas mettre à jour currentPhase automatiquement - laisser l'utilisateur naviguer manuellement
              // progress.currentPhase = nextPhase.id;
              firstAvailableStep.status = 'in_progress';
              nextPhase.status = 'in_progress';
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

      // Mettre à jour le statut de la phase
      const activeSteps = phase.steps.filter(s => !s.disabled);
      
      // Logique spéciale pour la Phase 2 : complétée quand tous les steps sauf le step 9 sont complétés
      if (phase.id === 2) {
        const stepsWithoutStep9 = activeSteps.filter(s => s.id !== 9);
        const allStepsExceptStep9Completed = stepsWithoutStep9.every(s => s.status === 'completed');
        if (allStepsExceptStep9Completed) {
          phase.status = 'completed';
        } else if (activeSteps.some(s => s.status === 'completed' || s.status === 'in_progress')) {
          phase.status = 'in_progress';
        }
      }
      // Logique spéciale pour la Phase 3 : complétée dès que le step 10 est complété
      else if (phase.id === 3) {
        const step10 = phase.steps.find(s => s.id === 10);
        if (step10 && step10.status === 'completed') {
          phase.status = 'completed';
        } else if (activeSteps.some(s => s.status === 'completed' || s.status === 'in_progress')) {
          phase.status = 'in_progress';
        }
      } else {
        // Logique normale pour les autres phases
        const allStepsCompleted = activeSteps.every(s => s.status === 'completed');
        if (allStepsCompleted) {
          phase.status = 'completed';
        } else if (activeSteps.some(s => s.status === 'completed' || s.status === 'in_progress')) {
          phase.status = 'in_progress';
        }
      }

      // Calculer automatiquement la phase courante basée sur l'état réel
      const currentActivePhase = progress.phases.find(p => 
        p.status === 'in_progress' || 
        (p.status === 'pending' && p.steps.some(s => s.status === 'in_progress'))
      );
      
      if (currentActivePhase) {
        progress.currentPhase = currentActivePhase.id;
      }

      await progress.save();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: 'Error updating step progress', error });
    }
  }

  // Mettre à jour la phase courante
  async updateCurrentPhase(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const { phase } = req.body;
      console.log('phase reçu:', phase);
      console.log('companyId reçu:', companyId);
      const progress = await OnboardingProgress.findOne({ companyId });
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      // Validation: vérifier que toutes les phases précédentes sont complétées
      // Cette validation empêche l'accès à une phase si les phases précédentes ne sont pas terminées
      // Par exemple: on ne peut pas accéder à la phase 4 si les phases 1, 2 ou 3 ne sont pas complétées
      if (phase > 1) {
        // Récupérer toutes les phases avec un ID inférieur à la phase demandée
        const previousPhases = progress.phases.filter(p => p.id < phase);
        // Filtrer pour ne garder que les phases non complétées
        const incompletePreviousPhases = previousPhases.filter(p => p.status !== 'completed');
        
        // Si des phases précédentes ne sont pas complétées, refuser l'accès
        if (incompletePreviousPhases.length > 0) {
          return res.status(400).json({ 
            message: 'Cannot access phase ' + phase + ' because previous phases are not completed',
            incompletePhases: incompletePreviousPhases.map(p => p.id)
          });
        }
      }

      progress.currentPhase = phase;
      await progress.save();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: 'Error updating current phase', error });
    }
  }

  // Réinitialiser le progrès d'onboarding
  async resetProgress(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      await OnboardingProgress.findOneAndDelete({ companyId });
      
      // Réinitialiser avec les valeurs par défaut
      const initialProgress = new OnboardingProgress({
        companyId,
        currentPhase: 1,
        completedSteps: [],
        phases: [
          { id: 1, status: 'in_progress', steps: Array.from({length: 3}, (_, i) => ({ id: i + 1, status: 'pending' })) },
          { id: 2, status: 'pending', steps: Array.from({length: 6}, (_, i) => ({ id: i + 4, status: 'pending' })) },
          { id: 3, status: 'pending', steps: Array.from({length: 3}, (_, i) => ({ id: i + 10, status: 'pending' })) },
          { id: 4, status: 'pending', steps: [{ id: 13, status: 'pending' }] }
        ]
      });

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
      
      const progress = await OnboardingProgress.findOne({ companyId });
      if (!progress) {
        return res.status(404).json({ message: 'Onboarding progress not found' });
      }

      // Calculer la phase courante basée sur l'état réel
      const currentActivePhase = progress.phases.find(p => 
        p.status === 'in_progress' || 
        (p.status === 'pending' && p.steps.some(s => s.status === 'in_progress'))
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
      
      const progress = await OnboardingProgress.findOne({ companyId });
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