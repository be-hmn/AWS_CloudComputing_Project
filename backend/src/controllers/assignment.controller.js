import { assignmentService } from '../services/assignment.service.js';

export const assignmentController = {
  approve(req, res, next) {
    try {
      const id = Number(req.params.id);
      const result = assignmentService.approveAsMentor(req.user.id, id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  reject(req, res, next) {
    try {
      const id = Number(req.params.id);
      const result = assignmentService.rejectAsMentor(req.user.id, id, req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
};
