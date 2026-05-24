import { applicationService } from '../services/application.service.js';

export const applicationController = {
  create(req, res, next) {
    try {
      const app = applicationService.createMyApplication(req.user.id, req.body);
      res.status(201).json(app);
    } catch (e) {
      next(e);
    }
  },

  listMine(req, res, next) {
    try {
      res.json(applicationService.listMyApplications(req.user.id));
    } catch (e) {
      next(e);
    }
  },

  getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      res.json(applicationService.getOne(req.user, id));
    } catch (e) {
      next(e);
    }
  },

  cancel(req, res, next) {
    try {
      const id = Number(req.params.id);
      res.json(applicationService.cancelMy(req.user.id, id));
    } catch (e) {
      next(e);
    }
  },
};
