import { mentorService } from '../services/mentor.service.js';
import { applicationService } from '../services/application.service.js';
import { candidateService } from '../services/candidate.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { statsService } from '../services/stats.service.js';

export const adminController = {
  listMentors(req, res, next) {
    try {
      res.json(mentorService.listAllForAdmin());
    } catch (e) {
      next(e);
    }
  },

  async setMentorActive(req, res, next) {
    try {
      const id = Number(req.params.id);
      res.json(await mentorService.setActiveByAdmin(id, req.body.is_active));
    } catch (e) {
      next(e);
    }
  },

  listApplications(req, res, next) {
    try {
      res.json(applicationService.listForAdmin({ status: req.query.status }));
    } catch (e) {
      next(e);
    }
  },

  listCandidates(req, res, next) {
    try {
      const id = Number(req.params.id);
      res.json(candidateService.listCandidates(id));
    } catch (e) {
      next(e);
    }
  },

  assignMentor(req, res, next) {
    try {
      const id = Number(req.params.id);
      const a = assignmentService.assignByAdmin(id, req.body.mentor_id);
      res.status(201).json(a);
    } catch (e) {
      next(e);
    }
  },

  listMenteeApplications(req, res, next) {
    try {
      const id = Number(req.params.id);
      res.json(applicationService.listByMenteeForAdmin(id));
    } catch (e) {
      next(e);
    }
  },

  mentorStats(req, res, next) {
    try {
      res.json(statsService.mentorStats());
    } catch (e) {
      next(e);
    }
  },
};
