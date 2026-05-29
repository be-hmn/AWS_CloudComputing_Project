import { recordService } from '../services/record.service.js';

export const recordController = {
  async create(req, res, next) {
    try {
      const id = Number(req.params.id);
      const r = await recordService.createRecord(req.user.id, id, req.body);
      res.status(201).json(r);
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const r = await recordService.updateRecord(req.user.id, id, req.body);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },

  async complete(req, res, next) {
    try {
      const id = Number(req.params.id);
      const r = recordService.completeAsMentor(req.user.id, id);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },

  async getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      const r = await recordService.getRecord(req.user, id);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },

  async listMine(req, res, next) {
    try {
      res.json(await recordService.listMyRecords(req.user.id));
    } catch (e) {
      next(e);
    }
  },

  async listMentorRecords(req, res, next) {
    try {
      res.json(await recordService.listMyRecordsAsMentor(req.user.id));
    } catch (e) {
      next(e);
    }
  },

  async listAll(req, res, next) {
    try {
      res.json(await recordService.listAllForAdmin());
    } catch (e) {
      next(e);
    }
  },
};
