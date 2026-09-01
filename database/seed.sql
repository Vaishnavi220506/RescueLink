INSERT INTO users (id, name, email, password_hash, role, is_available, location_label) VALUES
('00000000-0000-0000-0000-000000000001', 'Ananya Rao', 'ananya@rescue.link', '$2a$12$51bVXrufehVaNnZsJRmy5.t7Z2SqZOE9DyHvYF8Monz7AcAuETpoK', 'VOLUNTEER', true, 'Adyar, Chennai'),
('00000000-0000-0000-0000-000000000002', 'Operations admin', 'ops@rescue.link', '$2a$12$51bVXrufehVaNnZsJRmy5.t7Z2SqZOE9DyHvYF8Monz7AcAuETpoK', 'ADMIN', true, 'Chennai'),
('00000000-0000-0000-0000-000000000003', 'Priya Menon', 'priya@example.com', '$2a$12$51bVXrufehVaNnZsJRmy5.t7Z2SqZOE9DyHvYF8Monz7AcAuETpoK', 'CITIZEN', false, 'Velachery')
ON CONFLICT (email) DO NOTHING;

INSERT INTO help_requests (requester_id, category, title, description, urgency, location_label, location, people_affected, contact_preference, status)
VALUES ('00000000-0000-0000-0000-000000000003', 'MEDICAL', 'Insulin needed for elderly patient', 'Family is unable to reach the pharmacy due to flooding on Velachery Main Road.', 'HIGH', 'Velachery Main Road', ST_SetSRID(ST_MakePoint(80.2182, 12.9816),4326)::geography, 1, 'IN_APP', 'OPEN'),
('00000000-0000-0000-0000-000000000003', 'WATER', 'Drinking water for apartment block', 'Residents on the upper floors have been without drinking water since this morning.', 'MEDIUM', 'Saidapet', ST_SetSRID(ST_MakePoint(80.2231, 13.0216),4326)::geography, 18, 'IN_APP', 'OPEN');

INSERT INTO hazards (reporter_id, type, description, severity, location_label, location, verification, confirmations)
VALUES ('00000000-0000-0000-0000-000000000003', 'FLOOD', 'Underpass is completely submerged. Do not attempt to cross.', 'HIGH', 'Saidapet underpass', ST_SetSRID(ST_MakePoint(80.2228, 13.0216),4326)::geography, 'COMMUNITY_VERIFIED', 12),
('00000000-0000-0000-0000-000000000003', 'POWER_LINE', 'Live wire down across the road. Area has not been cleared.', 'CRITICAL', 'LB Road near SRM bus stop', ST_SetSRID(ST_MakePoint(80.2646, 13.0097),4326)::geography, 'UNVERIFIED', 4);

INSERT INTO alerts (created_by, title, description, severity, area, radius_km)
VALUES ('00000000-0000-0000-0000-000000000002', 'Flood warning near Adyar River', 'Water levels are rising. Avoid low-lying roads around Kotturpuram and Saidapet.', 'CRITICAL', 'Adyar river basin', 5)
ON CONFLICT DO NOTHING;
