-- 001_init.sql — initial schema for Nexa Loan Management (versioned)
-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- loan_products (config)
CREATE TABLE IF NOT EXISTS loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  min_amount NUMERIC(12,2),
  max_amount NUMERIC(12,2),
  base_interest NUMERIC(5,2),
  min_tenure_months INT,
  max_tenure_months INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- loans
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES loan_products(id),
  original_amount NUMERIC(12,2) NOT NULL,
  outstanding_amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(6,4) NOT NULL,
  tenure_months INT NOT NULL,
  monthly_emi NUMERIC(12,2) NULL,
  disbursed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- loan_applications (staging)
CREATE TABLE IF NOT EXISTS loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES loan_products(id),
  requested_amount NUMERIC(12,2) NOT NULL,
  requested_tenure INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- payments / transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  method TEXT,
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  loan_application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- seed a loan product for testing
INSERT INTO loan_products (name, description, min_amount, max_amount, base_interest, min_tenure_months, max_tenure_months)
SELECT 'Personal Loan', 'Unsecured personal loan', 10000, 1000000, 10.5, 12, 60
WHERE NOT EXISTS (SELECT 1 FROM loan_products WHERE name = 'Personal Loan');
