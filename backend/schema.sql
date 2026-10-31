CREATE DATABASE IF NOT EXISTS labourconnect_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE labourconnect_db;

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('worker', 'contractor') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS worker_profiles (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    primary_skill VARCHAR(80),
    experience_years DECIMAL(4,1) NOT NULL DEFAULT 0,
    preferred_area VARCHAR(100),
    languages VARCHAR(150),
    CONSTRAINT fk_worker_user FOREIGN KEY (user_id)
      REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contractor_profiles (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    organization_name VARCHAR(150),
    work_area VARCHAR(100),
    CONSTRAINT fk_contractor_user FOREIGN KEY (user_id)
      REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jobs (
    job_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contractor_id BIGINT UNSIGNED NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    description TEXT,
    work_location VARCHAR(150) NOT NULL,
    daily_wage DECIMAL(10,2) NOT NULL,
    workers_required INT UNSIGNED NOT NULL DEFAULT 1,
    start_date DATE,
    end_date DATE,
    status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jobs_location_status (work_location, status),
    CONSTRAINT fk_job_contractor FOREIGN KEY (contractor_id)
      REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
    application_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT UNSIGNED NOT NULL,
    worker_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_job_worker (job_id, worker_id),
    CONSTRAINT fk_application_job FOREIGN KEY (job_id)
      REFERENCES jobs(job_id),
    CONSTRAINT fk_application_worker FOREIGN KEY (worker_id)
      REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agreements (
    agreement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT UNSIGNED NOT NULL,
    contractor_id BIGINT UNSIGNED NOT NULL,
    worker_id BIGINT UNSIGNED NOT NULL,
    agreed_daily_wage DECIMAL(10,2) NOT NULL,
    expected_days INT UNSIGNED NOT NULL,
    payment_schedule VARCHAR(100),
    terms_text TEXT,
    status ENUM('draft', 'pending', 'accepted', 'rejected',
                'completed', 'disputed') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    CONSTRAINT fk_agreement_job FOREIGN KEY (job_id)
      REFERENCES jobs(job_id),
    CONSTRAINT fk_agreement_contractor FOREIGN KEY (contractor_id)
      REFERENCES users(user_id),
    CONSTRAINT fk_agreement_worker FOREIGN KEY (worker_id)
      REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
    attendance_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agreement_id BIGINT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    attendance_status ENUM('present', 'absent', 'half_day') NOT NULL,
    notes VARCHAR(255),
    UNIQUE KEY uq_agreement_work_date (agreement_id, work_date),
    CONSTRAINT fk_attendance_agreement FOREIGN KEY (agreement_id)
      REFERENCES agreements(agreement_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agreement_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    notes VARCHAR(255),
    CONSTRAINT fk_payment_agreement FOREIGN KEY (agreement_id)
      REFERENCES agreements(agreement_id)
) ENGINE=InnoDB;
