import { z } from 'zod';
import { AppError } from '../domain/errors.js';

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'invalid ISO date',
});

const availabilitySlot = z
  .object({
    start_at: isoDate,
    end_at: isoDate,
  })
  .superRefine((val, ctx) => {
    if (Date.parse(val.end_at) <= Date.parse(val.start_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_at'],
        message: 'end_at must be after start_at',
      });
    }
  });

export const createProfileBody = z.object({
  major: z.string().min(1).max(100),
  intro: z.string().max(2000).optional(),
  fields: z.array(z.string().min(1).max(64)).min(1),
  availabilities: z.array(availabilitySlot).min(1),
  profile_image_key: z.string().max(512).optional(),
});

export const patchProfileBody = z
  .object({
    major: z.string().min(1).max(100).optional(),
    intro: z.string().max(2000).optional(),
    fields: z.array(z.string().min(1).max(64)).min(1).optional(),
    availabilities: z.array(availabilitySlot).min(1).optional(),
    profile_image_key: z.string().max(512).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'at least one field is required',
  });

export const setActiveBody = z.object({
  is_active: z.boolean(),
});

export { availabilitySlot };

/** 서비스 레이어에서 추가 검증이 필요할 때 사용하는 헬퍼 */
export function assertValidSlot(slot) {
  if (Date.parse(slot.end_at) <= Date.parse(slot.start_at)) {
    throw AppError.invalidTimeFormat('end_at must be after start_at');
  }
}
