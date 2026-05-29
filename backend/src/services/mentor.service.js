import { AppError } from '../domain/errors.js';
import { mentorRepo } from '../repositories/mentor.repo.js';
import { userRepo } from '../repositories/user.repo.js';
import { fileService } from './file.service.js';
import { timeStringToMinutes, minutesToTimeString } from '../utils/datetime.js';

/** body availabilities → repository row 형태로 변환 */
function bodySlotsToRows(slots = []) {
  return slots.map((s) => ({
    weekday: Number(s.weekday),
    start_minutes: timeStringToMinutes(s.start_time),
    end_minutes: timeStringToMinutes(s.end_time),
  }));
}

/** repository row → 클라이언트 응답 형태로 변환 */
function rowsToResponseSlots(rows = []) {
  return rows.map((r) => ({
    id: r.id,
    weekday: r.weekday,
    start_time: minutesToTimeString(r.start_minutes),
    end_time: minutesToTimeString(r.end_minutes),
  }));
}

function shapeProfile(profile, { downloadUrl } = {}) {
  if (!profile) return null;
  const rawAvail = profile.availabilities ?? mentorRepo.getAvailabilities(profile.id);
  return {
    id: profile.id,
    user_id: profile.user_id,
    major: profile.major,
    intro: profile.intro,
    profile_image_key: profile.profile_image_key,
    profile_image_url: downloadUrl ?? null,
    is_active: profile.is_active,
    fields: profile.fields ?? mentorRepo.getFields(profile.id),
    availabilities: rowsToResponseSlots(rawAvail),
    created_at: profile.created_at,
  };
}

export const mentorService = {
  async createMyProfile(userId, body) {
    const existing = mentorRepo.getByUserId(userId);
    if (existing) {
      throw AppError.conflict('PROFILE_ALREADY_EXISTS', '이미 멘토 프로필이 존재합니다.');
    }
    const profile = mentorRepo.insertProfile({
      user_id: userId,
      major: body.major,
      intro: body.intro,
      profile_image_key: body.profile_image_key,
    });
    mentorRepo.replaceFields(profile.id, body.fields);
    mentorRepo.replaceAvailabilities(profile.id, bodySlotsToRows(body.availabilities));
    return await this.getMyProfile(userId);
  },

  async getMyProfile(userId) {
    const p = mentorRepo.getByUserId(userId);
    if (!p) throw AppError.notFound('멘토 프로필이 등록되지 않았습니다.');
    let downloadUrl = null;
    if (p.profile_image_key) {
      const r = await fileService.requestDownloadUrlByOwner(p.profile_image_key);
      downloadUrl = r.download_url;
    }
    return shapeProfile(
      { ...p, fields: mentorRepo.getFields(p.id), availabilities: mentorRepo.getAvailabilities(p.id) },
      { downloadUrl },
    );
  },

  async patchMyProfile(userId, patch) {
    const p = mentorRepo.getByUserId(userId);
    if (!p) throw AppError.notFound('멘토 프로필이 등록되지 않았습니다.');
    mentorRepo.updateProfile(p.id, {
      major: patch.major,
      intro: patch.intro,
      profile_image_key: patch.profile_image_key,
    });
    if (patch.fields) mentorRepo.replaceFields(p.id, patch.fields);
    if (patch.availabilities) mentorRepo.replaceAvailabilities(p.id, bodySlotsToRows(patch.availabilities));
    return await this.getMyProfile(userId);
  },

  async setActiveByAdmin(mentorId, isActive) {
    const updated = mentorRepo.setActive(mentorId, isActive);
    if (!updated) throw AppError.notFound('멘토를 찾을 수 없습니다.');
    return shapeProfile({
      ...updated,
      fields: mentorRepo.getFields(updated.id),
      availabilities: mentorRepo.getAvailabilities(updated.id),
    });
  },

  listPublic(field) {
    const profiles = field
      ? mentorRepo.listActiveCandidatesByField(field)
      : mentorRepo.listAll({ activeOnly: true });
    return profiles.map((p) => {
      const u = userRepo.findById(p.user_id);
      return {
        id: p.id,
        name: u?.name ?? null,
        major: p.major,
        intro: p.intro,
        fields: p.fields ?? mentorRepo.getFields(p.id),
        availabilities: rowsToResponseSlots(p.availabilities ?? mentorRepo.getAvailabilities(p.id)),
      };
    });
  },

  listAllForAdmin() {
    return mentorRepo.listAll().map((p) => {
      const u = userRepo.findById(p.user_id);
      return {
        ...shapeProfile(p),
        name: u?.name ?? null,
        email: u?.email ?? null,
      };
    });
  },
};
