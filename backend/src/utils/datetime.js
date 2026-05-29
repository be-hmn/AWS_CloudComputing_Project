/**
 * Asia/Seoul 기준 시간 헬퍼.
 * 서버 TZ 와 무관하게 항상 KST 기준으로 weekday/시각을 계산해야 하므로
 * Intl.DateTimeFormat 의 timeZone='Asia/Seoul' 옵션을 사용한다.
 */

const TZ = 'Asia/Seoul';

const _wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });
const _hmFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * ISO datetime 문자열을 KST 기준 { weekday: 0..6, minutes: 0..1439 } 로 변환.
 */
export function isoToKstWeekdayMinutes(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const wd = WEEKDAY_INDEX[_wdFmt.format(d)];
  const [h, m] = _hmFmt.format(d).split(':').map((s) => Number(s));
  return { weekday: wd, minutes: h * 60 + m };
}

/**
 * "HH:mm" 문자열을 0..1440 분 정수로 변환. 잘못된 형식이면 null.
 */
export function timeStringToMinutes(s) {
  if (typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  if (h === 24 && min !== 0) return null;
  return h * 60 + min;
}

/**
 * 0..1440 분 정수를 "HH:mm" 으로.
 */
export function minutesToTimeString(n) {
  const m = ((n % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
