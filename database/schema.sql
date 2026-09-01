CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('CITIZEN', 'VOLUNTEER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE request_category AS ENUM ('MEDICAL', 'FOOD', 'WATER', 'SHELTER', 'TRANSPORT', 'RESCUE', 'SUPPLIES', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE request_urgency AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE request_status AS ENUM ('OPEN', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE offer_status AS ENUM ('ACTIVE', 'PAUSED', 'EXHAUSTED', 'EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE hazard_type AS ENUM ('FLOOD', 'FIRE', 'ROAD_BLOCK', 'POWER_LINE', 'DEBRIS', 'BUILDING_DAMAGE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE hazard_verification AS ENUM ('UNVERIFIED', 'COMMUNITY_VERIFIED', 'ADMIN_VERIFIED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_severity AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(80) NOT NULL, email VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role user_role NOT NULL DEFAULT 'CITIZEN', is_available BOOLEAN NOT NULL DEFAULT false,
  location_label VARCHAR(180), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), requester_id UUID NOT NULL REFERENCES users(id), category request_category NOT NULL,
  title VARCHAR(120) NOT NULL, description VARCHAR(2000) NOT NULL, urgency request_urgency NOT NULL,
  location_label VARCHAR(180) NOT NULL, location geography(Point,4326) NOT NULL, people_affected INTEGER NOT NULL CHECK (people_affected > 0),
  contact_preference VARCHAR(12) NOT NULL CHECK (contact_preference IN ('IN_APP','PHONE','WHATSAPP')),
  status request_status NOT NULL DEFAULT 'OPEN', assigned_volunteer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS help_requests_status_idx ON help_requests(status);
CREATE INDEX IF NOT EXISTS help_requests_category_idx ON help_requests(category);
CREATE INDEX IF NOT EXISTS help_requests_urgency_idx ON help_requests(urgency);
CREATE INDEX IF NOT EXISTS help_requests_requester_idx ON help_requests(requester_id);
CREATE INDEX IF NOT EXISTS help_requests_assigned_idx ON help_requests(assigned_volunteer_id);
CREATE INDEX IF NOT EXISTS help_requests_created_idx ON help_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS help_requests_location_idx ON help_requests USING GIST(location);

CREATE TABLE IF NOT EXISTS resource_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), category request_category NOT NULL,
  description VARCHAR(1000) NOT NULL, quantity VARCHAR(120) NOT NULL, radius_km NUMERIC(5,2) NOT NULL CHECK (radius_km > 0),
  location_label VARCHAR(180) NOT NULL, location geography(Point,4326) NOT NULL, status offer_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resource_offers_status_idx ON resource_offers(status);
CREATE INDEX IF NOT EXISTS resource_offers_owner_idx ON resource_offers(owner_id);
CREATE INDEX IF NOT EXISTS resource_offers_category_idx ON resource_offers(category);
CREATE INDEX IF NOT EXISTS resource_offers_created_idx ON resource_offers(created_at DESC);
CREATE INDEX IF NOT EXISTS resource_offers_location_idx ON resource_offers USING GIST(location);

CREATE TABLE IF NOT EXISTS hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id UUID NOT NULL REFERENCES users(id), type hazard_type NOT NULL,
  description VARCHAR(2000) NOT NULL, severity alert_severity NOT NULL, location_label VARCHAR(180) NOT NULL,
  location geography(Point,4326) NOT NULL, verification hazard_verification NOT NULL DEFAULT 'UNVERIFIED', confirmations INTEGER NOT NULL DEFAULT 0,
  disputes INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hazards_verification_idx ON hazards(verification);
CREATE INDEX IF NOT EXISTS hazards_severity_idx ON hazards(severity);
CREATE INDEX IF NOT EXISTS hazards_type_idx ON hazards(type);
CREATE INDEX IF NOT EXISTS hazards_created_idx ON hazards(created_at DESC);
CREATE INDEX IF NOT EXISTS hazards_location_idx ON hazards USING GIST(location);

CREATE TABLE IF NOT EXISTS hazard_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, vote VARCHAR(10) NOT NULL CHECK (vote IN ('CONFIRM','DISPUTE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(hazard_id, user_id)
);

CREATE TABLE IF NOT EXISTS request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES users(id), assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), released_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_assignment_idx ON request_assignments(request_id) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_by UUID NOT NULL REFERENCES users(id), title VARCHAR(160) NOT NULL,
  description VARCHAR(2000) NOT NULL, severity alert_severity NOT NULL, area VARCHAR(180) NOT NULL, radius_km NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS alerts_expiry_idx ON alerts(expires_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL, description VARCHAR(500) NOT NULL, type VARCHAR(20) NOT NULL, is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS live_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, location geography(Point,4326) NOT NULL,
  status VARCHAR(40) NOT NULL, note VARCHAR(240), expires_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_locations_expiry_idx ON live_locations(expires_at);
CREATE INDEX IF NOT EXISTS live_locations_location_idx ON live_locations USING GIST(location);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES users(id), action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL, entity_id UUID, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
