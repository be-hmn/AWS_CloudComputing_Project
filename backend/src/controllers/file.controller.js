import { fileService } from '../services/file.service.js';

export const fileController = {
  async createUploadUrl(req, res, next) {
    try {
      res.json(await fileService.requestUploadUrl(req.user, req.body));
    } catch (e) {
      next(e);
    }
  },

  async createDownloadUrl(req, res, next) {
    try {
      // 본 V1 에서는 단순화: 인증된 사용자라면 키를 알고 있으면 발급.
      // 실제 운영 단계에서는 키 prefix 기반의 권한 검증 추가가 필요하다.
      const key = req.params[0] || req.params.key;
      res.json(await fileService.requestDownloadUrlByOwner(key));
    } catch (e) {
      next(e);
    }
  },
};
