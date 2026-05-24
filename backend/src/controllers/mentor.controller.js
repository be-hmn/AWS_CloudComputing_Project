import { mentorService } from '../services/mentor.service.js';
import { assignmentService } from '../services/assignment.service.js';

export const mentorController = {
  async createMyProfile(req, res, next) {
    try {
      const profile = await mentorService.createMyProfile(req.user.id, req.body);
      res.status(201).json(profile);
    } catch (e) {
      next(e);
    }
  },

  async getMyProfile(req, res, next) {
    try {
      const profile = await mentorService.getMyProfile(req.user.id);
      res.json(profile);
    } catch (e) {
      next(e);
    }
  },

  async patchMyProfile(req, res, next) {
    try {
      const profile = await mentorService.patchMyProfile(req.user.id, req.body);
      res.json(profile);
    } catch (e) {
      next(e);
    }
  },

  listPublic(req, res, next) {
    try {
      res.json(mentorService.listPublic(req.query.field));
    } catch (e) {
      next(e);
    }
  },

  listMyAssignments(req, res, next) {
    try {
      const items = assignmentService.listMyAssignments(req.user.id, {
        status: req.query.status,
      });
      res.json(items);
    } catch (e) {
      next(e);
    }
  },
};
