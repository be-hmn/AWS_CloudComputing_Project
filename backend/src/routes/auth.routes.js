import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginBody, registerBody } from '../schemas/auth.schema.js';

const router = Router();

router.post('/register', validate({ body: registerBody }), authController.register);
router.post('/login', validate({ body: loginBody }), authController.login);
router.get('/me', authRequired, authController.me);

export default router;
