import { sql } from '@/lib/db'

export async function POST() {
  try {
    const schema = `
      -- Create flows table if not exists
      CREATE TABLE IF NOT EXISTS flows (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create nodes table if not exists
      CREATE TABLE IF NOT EXISTS nodes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        config JSONB NOT NULL DEFAULT '{}',
        api_path VARCHAR(255),
        database_table VARCHAR(255),
        external_api_url VARCHAR(500),
        input_mapping JSONB DEFAULT '{}',
        output_mapping JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create flow_instances table if not exists
      CREATE TABLE IF NOT EXISTS flow_instances (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
        position_x FLOAT NOT NULL DEFAULT 0,
        position_y FLOAT NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create flow_connections table if not exists
      CREATE TABLE IF NOT EXISTS flow_connections (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        source_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
        target_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create flow_executions table if not exists
      CREATE TABLE IF NOT EXISTS flow_executions (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT
      );

      -- Create node_executions table if not exists
      CREATE TABLE IF NOT EXISTS node_executions (
        id SERIAL PRIMARY KEY,
        flow_execution_id INTEGER REFERENCES flow_executions(id) ON DELETE CASCADE,
        node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        input_data JSONB,
        output_data JSONB,
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );

      -- Create indexes if not exists
      CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_flow_instances_flow_id ON flow_instances(flow_id);
      CREATE INDEX IF NOT EXISTS idx_flow_connections_flow_id ON flow_connections(flow_id);
      CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
      CREATE INDEX IF NOT EXISTS idx_node_executions_flow_execution_id ON node_executions(flow_execution_id);
      CREATE INDEX IF NOT EXISTS idx_node_executions_status ON node_executions(status);
    `

    // Execute schema creation
    const queries = schema
      .split(';')
      .filter(query => query.trim())

    for (const query of queries) {
      if (query.trim()) {
        await sql([query.trim()], [])
      }
    }

    // Insert sample nodes
    const sampleNodes = [
      {
        name: 'Sample Product Node',
        type: 'product',
        config: { productId: 1 },
        api_path: '/api/products/process'
      },
      {
        name: 'Sample Template Node',
        type: 'template',
        config: { templateId: 1 },
        api_path: '/api/templates/process'
      },
      {
        name: 'Data Validator',
        type: 'custom',
        config: {},
        api_path: '/api/validate',
        external_api_url: 'https://api.example.com/validate'
      },
      {
        name: 'Database Logger',
        type: 'custom',
        config: {},
        database_table: 'activity_logs'
      }
    ]

    for (const node of sampleNodes) {
      try {
        await sql`
          INSERT INTO nodes (name, type, config, api_path, database_table, external_api_url)
          VALUES (
            ${node.name},
            ${node.type},
            ${JSON.stringify(node.config)},
            ${node.api_path || null},
            ${node.database_table || null},
            ${node.external_api_url || null}
          )
          ON CONFLICT (name) DO NOTHING
        `
      } catch (err) {
        // Ignore conflicts for sample data
        console.log('Sample node already exists:', node.name)
      }
    }

    return Response.json({
      success: true,
      message: 'Flow chart schema initialized successfully'
    })

  } catch (error) {
    console.error('Error initializing flow chart schema:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}