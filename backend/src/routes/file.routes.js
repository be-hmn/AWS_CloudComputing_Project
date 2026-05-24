import { Router } from 'express';
import { fileController } from '../controllers/file.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { uploadUrlBody } from '../schemas/file.schema.js';

const router = Router();
router.use(authRequired);

router.post(
  '/upload-url',
  validate({ body: uploadUrlBody }),
  fileController.createUploadUrl,
);

// `:key` 는 슬래시를 포함할 수 있으므로 와일드카드 사용
router.get('/url/*', fileController.createDownloadUrl);

export default router;
