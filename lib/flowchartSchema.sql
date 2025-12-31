-- Flow Chart System Database Schema

-- Table for storing flows
CREATE TABLE flows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing node definitions (reusable nodes)
CREATE TABLE nodes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- product, template, custom
  config JSONB NOT NULL DEFAULT '{}', -- Node configuration
  api_path VARCHAR(255), -- API path for this node (/api/XXX)
  database_table VARCHAR(255), -- Target database table (optional)
  external_api_url VARCHAR(500), -- External API URL (optional)
  input_mapping JSONB DEFAULT '{}', -- Input mapping configuration
  output_mapping JSONB DEFAULT '{}', -- Output mapping configuration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing flow instances (specific arrangements of nodes)
CREATE TABLE flow_instances (
  id SERIAL PRIMARY KEY,
  flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
  node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing connections between nodes in a flow
CREATE TABLE flow_connections (
  id SERIAL PRIMARY KEY,
  flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
  source_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing flow execution logs
CREATE TABLE flow_executions (
  id SERIAL PRIMARY KEY,
  flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- running, completed, failed
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Table for storing individual node execution logs
CREATE TABLE node_executions (
  id SERIAL PRIMARY KEY,
  flow_execution_id INTEGER REFERENCES flow_executions(id) ON DELETE CASCADE,
  node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- pending, running, completed, failed
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_flows_status ON flows(status);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_flow_instances_flow_id ON flow_instances(flow_id);
CREATE INDEX idx_flow_connections_flow_id ON flow_connections(flow_id);
CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX idx_node_executions_flow_execution_id ON node_executions(flow_execution_id);
CREATE INDEX idx_node_executions_status ON node_executions(status);