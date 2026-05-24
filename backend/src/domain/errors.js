/**
 * 도메인/HTTP 에러를 통합 표현하는 클래스.
 * errorHandler 미들웨어가 이 인스턴스를 인식해 일관된 응답 스키마로 직렬화한다.
 */
export class AppError extends Error {
  constructor(code, http, message, details) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.http = http;
    this.details = details;
  }

  toJSON() {
    const body = { code: this.code, message: this.message };
    if (this.details !== undefined) body.details = this.details;
    return body;
  }

  // ------- 정적 헬퍼들 -------
  static validationFailed(fields) {
    return new AppError('VALIDATION_FAILED', 400, '입력값이 유효하지 않습니다.', { fields });
  }
  static invalidTimeFormat(message = '시간 형식이 올바르지 않습니다.') {
    return new AppError('INVALID_TIME_FORMAT', 400, message);
  }
  static authTokenMissing() {
    return new AppError('AUTH_TOKEN_MISSING', 401, '인증 토큰이 필요합니다.');
  }
  static authTokenInvalid() {
    return new AppError('AUTH_TOKEN_INVALID', 401, '인증 토큰이 유효하지 않습니다.');
  }
  static loginFailed() {
    return new AppError('AUTH_LOGIN_FAILED', 401, '이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  static forbidden(message = '해당 리소스에 대한 권한이 없습니다.') {
    return new AppError('AUTH_FORBIDDEN', 403, message);
  }
  static notFound(message = '리소스를 찾을 수 없습니다.') {
    return new AppError('NOT_FOUND', 404, message);
  }
  static conflict(code, message, details) {
    return new AppError(code, 409, message, details);
  }
  static statusTransitionNotAllowed(from, to) {
    return new AppError(
      'STATUS_TRANSITION_NOT_ALLOWED',
      409,
      `상태 전이가 허용되지 않습니다: ${from} -> ${to}`,
      { from, to },
    );
  }
  static scheduleConflict() {
    return new AppError(
      'SCHEDULE_CONFLICT',
      409,
      '동일 시간대에 이미 확정된 상담이 있습니다.',
    );
  }
  static recordAlreadyExists() {
    return new AppError(
      'RECORD_ALREADY_EXISTS',
      409,
      '해당 신청에 대한 상담 기록이 이미 존재합니다.',
    );
  }
  static mentorInactive() {
    return new AppError('MENTOR_INACTIVE', 409, '비활성 상태인 멘토에게는 배정할 수 없습니다.');
  }
  static emailTaken() {
    return new AppError('EMAIL_TAKEN', 409, '이미 사용 중인 이메일입니다.');
  }
  static fileTooLarge() {
    return new AppError('FILE_TOO_LARGE', 413, '파일 크기가 허용 한도를 초과했습니다.');
  }
  static fileTypeNotAllowed() {
    return new AppError('FILE_TYPE_NOT_ALLOWED', 400, '허용되지 않은 파일 형식입니다.');
  }
}
