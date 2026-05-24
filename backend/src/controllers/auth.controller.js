import { authService } from '../services/auth.service.js';

export const authController = {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  },

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  me(req, res) {
    res.json(req.user);
  },
};
