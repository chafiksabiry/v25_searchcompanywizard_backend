import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/companyService';
import { CompanyModel } from '../database/models/CompanyModel';

const companyService = new CompanyService();

/** Widgets a company can place on its dashboard (keep in sync with the front catalogue). */
export const DASHBOARD_WIDGET_IDS = [
  'kpis',
  'voiceAssistant',
  'coverage',
  'agents',
  'resources',
  'performance7d',
] as const;


export class CompanyController {
  async createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { kybVerified: _ignored, dashboardConfig: _cfg, ...body } = req.body ?? {};
      const company = await companyService.createCompany(body);
      // Upsert: create or update existing (same user / same name draft).
      const status = 200;
      res.status(status).json({
        success: true,
        message: 'Company saved successfully',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const companies = await companyService.getAllCompanies();
      res.status(200).json({
        success: true,
        message: 'Companies retrieved successfully',
        data: companies,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCompanyById(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companyService.getCompanyById(req.params.id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }
      res.status(200).json({
        success: true,
        message: 'Company retrieved successfully',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      // The verified badge is only ever set by the verification flow, never by profile edits.
      const { kybVerified: _ignored, dashboardConfig: _cfg, ...body } = req.body ?? {};
      const updatedCompany = await companyService.updateCompany(req.params.id, body);
      if (!updatedCompany) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }
      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: updatedCompany,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await companyService.deleteCompany(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }
      res.status(200).json({
        success: true,
        message: 'Company deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { subscription } = req.body;

      // Vérifier que le plan est valide
      if (!['free', 'standard', 'premium'].includes(subscription)) {
        return res.status(400).json({ message: 'Invalid subscription plan' });
      }

      const company = await CompanyModel.findByIdAndUpdate(
        id,
        { subscription },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      res.status(200).json(company);
    } catch (error) {
      console.error('Error updating subscription:', error);
      res.status(500).json({ message: 'Error updating subscription' });
    }
  }

  async getCompanyByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companyService.getCompanyByUserId(req.params.userId);
      // Optional: a user may not have created a company yet (onboarding step 1).
      // Return 200 + null instead of 404 so clients do not treat it as an error.
      res.status(200).json({
        success: true,
        message: company
          ? 'Company retrieved successfully'
          : 'No company for this user yet',
        data: company || null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCompanyDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companyService.getCompanyDetails(req.params.id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company details not found',
        });
      }
      res.status(200).json({
        success: true,
        message: 'Company details retrieved successfully',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Per-company dashboard layout: ordered list of widgets with their visibility. */
  async getDashboardConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await CompanyModel.findById(req.params.id).select('dashboardConfig').lean<any>();
      if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
      const cfg = company.dashboardConfig;
      res.status(200).json({
        success: true,
        data: { widgets: cfg?.widgets ?? [], updatedAt: cfg?.updatedAt ?? null, configured: Boolean(cfg?.updatedAt) },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDashboardConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.body?.widgets;
      if (!Array.isArray(raw)) {
        return res.status(400).json({ success: false, message: 'widgets must be an array' });
      }
      const seen = new Set<string>();
      const widgets: { id: string; enabled: boolean }[] = [];
      for (const w of raw) {
        const id = String(w?.id ?? '');
        if (!(DASHBOARD_WIDGET_IDS as readonly string[]).includes(id) || seen.has(id)) continue;
        seen.add(id);
        widgets.push({ id, enabled: w?.enabled !== false });
      }
      const updatedAt = new Date();
      const company = await CompanyModel.findByIdAndUpdate(
        req.params.id,
        { $set: { dashboardConfig: { widgets, updatedAt } } },
        { new: true }
      ).select('_id');
      if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
      res.status(200).json({ success: true, data: { widgets, updatedAt, configured: true } });
    } catch (error) {
      next(error);
    }
  }
}
