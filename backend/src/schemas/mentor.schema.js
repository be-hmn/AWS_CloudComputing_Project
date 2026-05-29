import { z } from 'zod';
import { AppError } from '../domain/errors.js';
import { timeStringToMinutes } from '../utils/datetime.js';

/**
 * 주간 반복 가능 시간 슬롯.
 *  weekday: 0(일) ~ 6(토)
 *  start_time/end_time: "HH:mm" (24h)
 */
const availabilitySlot = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string(),
    end_time: z.string(),
  })
  .superRefine((val, ctx) => {
    const sm = timeStringToMinutes(val.start_time);
    const em = timeStringToMinutes(val.end_time);
    if (sm === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start_time'], message: 'invalid HH:mm' });
      return;
    }
    if (em === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_time'], message: 'invalid HH:mm' });
      return;
    }
    if (em <= sm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_time'], message: 'end_time must be after start_time' });
    }
  });

export const createProfileBody = z.object({
  major: z.string().min(1).max(100),
  intro: z.string().max(2000).optional(),
  fields: z.array(z.string().min(1).max(64)).min(1),
  availabilities: z.array(availabilitySlot).min(1).max(14),
  profile_image_key: z.string().max(512).optional(),
});

export const patchProfileBody = z
  .object({
    major: z.string().min(1).max(100).optional(),
    intro: z.string().max(2000).optional(),
    fields: z.array(z.string().min(1).max(64)).min(1).optional(),
    availabilities: z.array(availabilitySlot).min(1).max(14).optional(),
    profile_image_key: z.string().max(512).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'at least one field is required',
  });

export const setActiveBody = z.object({
  is_active: z.boolean(),
});

export { availabilitySlot };

/** 서비스 레이어 보조용 */
export function assertValidSlot(slot) {
  const sm = timeStringToMinutes(slot.start_time);
  const em = timeStringToMinutes(slot.end_time);
  if (sm === null || em === null || em <= sm) {
    throw AppError.invalidTimeFormat('가능 시간이 올바르지 않습니다.');
  }
}
