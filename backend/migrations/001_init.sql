-- KMU Cloud 멘토링 매칭 시스템 V1 초기 스키마
-- MySQL 8 기준

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('MENTEE','MENTOR','ADMIN') NOT NULL,
  name          VARCHAR(100)    NOT NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. mentor_profiles
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  major               VARCHAR(100)    NOT NULL,
  intro               TEXT            NULL,
  profile_image_key   VARCHAR(512)    NULL,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_mentor_profiles_user_id (user_id),
  CONSTRAINT fk_mentor_profiles_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. mentor_fields (멘토 ↔ 분야 다대다)
CREATE TABLE IF NOT EXISTS mentor_fields (
  mentor_id BIGINT UNSIGNED NOT NULL,
  field     VARCHAR(64)     NOT NULL,
  PRIMARY KEY (mentor_id, field),
  KEY idx_mentor_fields_field (field),
  CONSTRAINT fk_mentor_fields_mentor FOREIGN KEY (mentor_id) REFERENCES mentor_profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. mentor_availabilities
CREATE TABLE IF NOT EXISTS mentor_availabilities (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mentor_id BIGINT UNSIGNED NOT NULL,
  start_at  DATETIME(3)     NOT NULL,
  end_at    DATETIME(3)     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_mentor_availabilities_mentor (mentor_id, start_at, end_at),
  CONSTRAINT fk_mentor_availabilities_mentor FOREIGN KEY (mentor_id) REFERENCES mentor_profiles (id) ON DELETE CASCADE,
  CONSTRAINT chk_mentor_availabilities_range CHECK (end_at > start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. applications
CREATE TABLE IF NOT EXISTS applications (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mentee_id       BIGINT UNSIGNED NOT NULL,
  interest_field  VARCHAR(64)     NOT NULL,
  topic           VARCHAR(255)    NOT NULL,
  desired_at      DATETIME(3)     NOT NULL,
  message         TEXT            NULL,
  status          ENUM('SUBMITTED','UNDER_REVIEW','SCHEDULED','COMPLETED','REJECTED','CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_applications_mentee_created (mentee_id, created_at),
  KEY idx_applications_status_created (status, created_at),
  KEY idx_applications_interest_field (interest_field),
  CONSTRAINT fk_applications_mentee FOREIGN KEY (mentee_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. assignments
CREATE TABLE IF NOT EXISTS assignments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id  BIGINT UNSIGNED NOT NULL,
  mentor_id       BIGINT UNSIGNED NOT NULL,
  status          ENUM('PENDING','APPROVED','REJECTED','SUPERSEDED') NOT NULL DEFAULT 'PENDING',
  reject_reason   VARCHAR(500)    NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  closed_at       DATETIME(3)     NULL,
  PRIMARY KEY (id),
  KEY idx_assignments_application (application_id, created_at),
  KEY idx_assignments_mentor_status (mentor_id, status),
  CONSTRAINT fk_assignments_application FOREIGN KEY (application_id) REFERENCES applications (id),
  CONSTRAINT fk_assignments_mentor FOREIGN KEY (mentor_id) REFERENCES mentor_profiles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. consultation_schedules
CREATE TABLE IF NOT EXISTS consultation_schedules (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id  BIGINT UNSIGNED NOT NULL,
  mentor_id       BIGINT UNSIGNED NOT NULL,
  scheduled_at    DATETIME(3)     NOT NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_consultation_schedules_application (application_id),
  UNIQUE KEY uq_consultation_schedules_mentor_time (mentor_id, scheduled_at),
  CONSTRAINT fk_schedules_application FOREIGN KEY (application_id) REFERENCES applications (id),
  CONSTRAINT fk_schedules_mentor FOREIGN KEY (mentor_id) REFERENCES mentor_profiles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. consultation_records
CREATE TABLE IF NOT EXISTS consultation_records (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id              BIGINT UNSIGNED NOT NULL,
  summary                     TEXT            NOT NULL,
  follow_up_task              TEXT            NULL,
  needs_next_consultation     TINYINT(1)      NOT NULL,
  attachment_key              VARCHAR(512)    NULL,
  created_at                  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_consultation_records_application (application_id),
  CONSTRAINT fk_records_application FOREIGN KEY (application_id) REFERENCES applications (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
