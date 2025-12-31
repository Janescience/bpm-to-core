-- SQLite version of Flow Chart System Database Schema

-- Create original tables first (for compatibility with existing system)
CREATE TABLE IF NOT EXISTS soap_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL UNIQUE,
  wsdl_url TEXT NOT NULL,
  soap_endpoint TEXT NULL,
  soap_user TEXT NULL,
  soap_password TEXT NULL,
  xml_structure TEXT NULL, -- JSONB equivalent in SQLite is TEXT
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS soap_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  product_name TEXT NOT NULL UNIQUE,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES soap_templates(id) ON DELETE CASCADE
);

-- Template field mappings
CREATE TABLE IF NOT EXISTS soap_template_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  xml_path TEXT NOT NULL,
  json_field TEXT NULL,
  parent_node TEXT NULL,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT NULL,
  function_type TEXT DEFAULT 'DIRECT',
  function_params TEXT DEFAULT '{}', -- JSON as TEXT
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES soap_templates(id) ON DELETE CASCADE,
  UNIQUE (template_id, xml_path)
);

-- Product field mappings (overrides)
CREATE TABLE IF NOT EXISTS soap_product_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  xml_path TEXT NOT NULL,
  json_field TEXT NULL,
  parent_node TEXT NULL,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT NULL,
  function_type TEXT DEFAULT 'DIRECT',
  function_params TEXT DEFAULT '{}', -- JSON as TEXT
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES soap_products(id) ON DELETE CASCADE,
  UNIQUE (product_id, xml_path)
);

-- Custom functions table
CREATE TABLE IF NOT EXISTS soap_custom_functions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  function_name TEXT NOT NULL UNIQUE,
  description TEXT,
  code TEXT NOT NULL,
  parameters TEXT DEFAULT '[]', -- JSON as TEXT
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- BPM SOAP History table
CREATE TABLE IF NOT EXISTS bpm_soap_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  json_file_name TEXT,
  json_path TEXT,
  service_url TEXT,
  reuest_bpm_soap TEXT,
  response_bpm_soap TEXT,
  policy_no TEXT,
  mstr_policy_no TEXT,
  system_type TEXT,
  http_status INTEGER,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Version log table
CREATE TABLE IF NOT EXISTS template_version_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changes TEXT NOT NULL, -- JSONB as TEXT
  updated_by TEXT,
  version_number INTEGER NOT NULL,
  FOREIGN KEY (template_id) REFERENCES soap_templates(id) ON DELETE CASCADE
);

-- Table for storing flows
CREATE TABLE IF NOT EXISTS flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing node definitions (reusable nodes)
CREATE TABLE IF NOT EXISTS nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  api_path TEXT,
  database_table TEXT,
  external_api_url TEXT,
  input_mapping TEXT DEFAULT '{}',
  output_mapping TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing flow instances (specific arrangements of nodes)
CREATE TABLE IF NOT EXISTS flow_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Table for storing connections between nodes in a flow
CREATE TABLE IF NOT EXISTS flow_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL,
  source_node_id INTEGER NOT NULL,
  target_node_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Table for storing flow execution logs
CREATE TABLE IF NOT EXISTS flow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  error_message TEXT,
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
);

-- Table for storing individual node execution logs
CREATE TABLE IF NOT EXISTS node_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_execution_id INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  input_data TEXT,
  output_data TEXT,
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (flow_execution_id) REFERENCES flow_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_name ON soap_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_product_name ON soap_products(product_name);
CREATE INDEX IF NOT EXISTS idx_product_template ON soap_products(template_id);
CREATE INDEX IF NOT EXISTS idx_template_mapping_template ON soap_template_mappings(template_id);
CREATE INDEX IF NOT EXISTS idx_product_mapping_product ON soap_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_custom_func_name ON soap_custom_functions(function_name);
CREATE INDEX IF NOT EXISTS idx_template_version_log_template_id ON template_version_log(template_id);

CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_flow_instances_flow_id ON flow_instances(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_connections_flow_id ON flow_connections(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_flow_execution_id ON node_executions(flow_execution_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_status ON node_executions(status);

-- Indexes for BPM SOAP History
CREATE INDEX IF NOT EXISTS idx_bpm_soap_history_json_file_name ON bpm_soap_history(json_file_name);
CREATE INDEX IF NOT EXISTS idx_bpm_soap_history_service_url ON bpm_soap_history(service_url);
CREATE INDEX IF NOT EXISTS idx_bpm_soap_history_policy_no ON bpm_soap_history(policy_no);
CREATE INDEX IF NOT EXISTS idx_bpm_soap_history_system_type ON bpm_soap_history(system_type);
CREATE INDEX IF NOT EXISTS idx_bpm_soap_history_http_status ON bpm_soap_history(http_status);
CREATE INDEX IF NOT EXISTS idx_bpm_soap_history_created_date ON bpm_soap_history(created_date);

-- Insert sample data for SQLite

-- Sample templates
INSERT OR IGNORE INTO soap_templates (id, template_name, wsdl_url, soap_endpoint) VALUES
  (1, 'Sample SOAP Template', 'http://example.com/sample.wsdl', 'http://example.com/soap/endpoint'),
  (2, 'Payment Gateway Template', 'http://example.com/payment.wsdl', 'http://example.com/payment/soap');

-- Sample products
INSERT OR IGNORE INTO soap_products (id, product_name, template_id) VALUES
  (1, 'Sample Product 1', 1),
  (2, 'Payment Product', 2);

-- Sample nodes
INSERT OR IGNORE INTO nodes (name, type, config, api_path, database_table, external_api_url) VALUES
  ('Sample Product Node', 'product', '{"productId": 1}', '/api/products/process', NULL, NULL),
  ('Sample Template Node', 'template', '{"templateId": 1}', '/api/templates/process', NULL, NULL),
  ('Data Validator', 'custom', '{}', '/api/validate', NULL, 'https://httpbin.org/post'),
  ('Database Logger', 'custom', '{}', NULL, 'activity_logs', NULL),
  ('JSON Placeholder API', 'custom', '{}', '/api/external/placeholder', NULL, 'https://jsonplaceholder.typicode.com/posts');

-- Create a sample flow
INSERT OR IGNORE INTO flows (name, description, status) VALUES
  ('Sample Flow', 'ตัวอย่าง Flow สำหรับทดสอบระบบ', 'draft');

-- Insert sample SOAP history data
INSERT OR IGNORE INTO bpm_soap_history (
  json_file_name, json_path, service_url, reuest_bpm_soap, response_bpm_soap,
  policy_no, mstr_policy_no, system_type, http_status, created_date
) VALUES
  ('policy_inquiry.json', '/api/policy/inquiry', 'https://api.insurance.com/soap/policy',
   '{"policyNo":"POL123456","action":"inquiry"}', '{"status":"success","data":{"policy":{"no":"POL123456","status":"active"}}}',
   'POL123456', 'MSTR001', 'POLICY_SYSTEM', 200, '2024-12-30 10:15:00'),

  ('claim_submit.json', '/api/claim/submit', 'https://api.insurance.com/soap/claim',
   '{"claimNo":"CLM789012","policyNo":"POL123456","amount":50000}', '{"status":"error","message":"Invalid policy number"}',
   'POL123456', 'MSTR001', 'CLAIM_SYSTEM', 400, '2024-12-30 11:20:00'),

  ('payment_process.json', '/api/payment/process', 'https://api.payment.com/soap/pay',
   '{"transactionId":"TXN345678","amount":1500.00}', '{"status":"success","transactionId":"TXN345678","confirmation":"CONF998877"}',
   'POL789123', 'MSTR002', 'PAYMENT_SYSTEM', 200, '2024-12-30 12:30:00'),

  ('policy_update.json', '/api/policy/update', 'https://api.insurance.com/soap/policy',
   '{"policyNo":"POL456789","updates":{"address":"123 New Street"}}', '{"status":"success","updated":true}',
   'POL456789', 'MSTR003', 'POLICY_SYSTEM', 200, '2024-12-30 13:45:00'),

  ('system_health.json', '/api/system/health', 'https://api.monitoring.com/health',
   '{"service":"soap-gateway","timestamp":"2024-12-30T14:00:00"}', '{"status":"timeout","message":"Service unavailable"}',
   NULL, NULL, 'MONITORING_SYSTEM', 503, '2024-12-30 14:00:00');