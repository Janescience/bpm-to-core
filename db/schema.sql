-- Templates table
CREATE TABLE public.soap_templates (
    id bigserial NOT NULL,
    template_name varchar(255) NOT NULL UNIQUE,
    wsdl_url text NOT NULL,
    soap_endpoint text NULL,
    soap_user varchar(255) NULL,
    soap_password varchar(255) NULL,
    xml_structure jsonb NULL,
    created_date timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT soap_templates_pkey PRIMARY KEY (id)
);

-- Products table
CREATE TABLE public.soap_products (
    id bigserial NOT NULL,
    template_id bigint NOT NULL,
    product_name varchar(255) NOT NULL UNIQUE,
    created_date timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT soap_products_pkey PRIMARY KEY (id),
    CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES public.soap_templates(id) ON DELETE CASCADE
);

-- Template field mappings
CREATE TABLE public.soap_template_mappings (
    id bigserial NOT NULL,
    template_id bigint NOT NULL,
    xml_path varchar(500) NOT NULL,
    json_field varchar(255) NULL,
    parent_node varchar(255) NULL,
    is_required boolean DEFAULT false,
    default_value text NULL,
    created_date timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT soap_template_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT fk_template_mapping FOREIGN KEY (template_id) REFERENCES public.soap_templates(id) ON DELETE CASCADE,
    CONSTRAINT unique_template_mapping UNIQUE (template_id, xml_path)
);

-- Product field mappings (overrides)
CREATE TABLE public.soap_product_mappings (
    id bigserial NOT NULL,
    product_id bigint NOT NULL,
    xml_path varchar(500) NOT NULL,
    json_field varchar(255) NULL,
    parent_node varchar(255) NULL,
    is_required boolean DEFAULT false,
    default_value text NULL,
    created_date timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT soap_product_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT fk_product_mapping FOREIGN KEY (product_id) REFERENCES public.soap_products(id) ON DELETE CASCADE,
    CONSTRAINT unique_product_mapping UNIQUE (product_id, xml_path)
);

-- Indexes for performance
CREATE INDEX idx_template_name ON public.soap_templates(template_name);
CREATE INDEX idx_product_name ON public.soap_products(product_name);
CREATE INDEX idx_product_template ON public.soap_products(template_id);
CREATE INDEX idx_template_mapping_template ON public.soap_template_mappings(template_id);
CREATE INDEX idx_product_mapping_product ON public.soap_product_mappings(product_id);


CREATE TABLE IF NOT EXISTS template_version_log (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES soap_templates(id) ON DELETE CASCADE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changes JSONB NOT NULL,
  updated_by VARCHAR(100),
  version_number INTEGER NOT NULL,
  CONSTRAINT fk_template
    FOREIGN KEY(template_id) 
    REFERENCES soap_templates(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_template_version_log_template_id ON template_version_log(template_id);
CREATE INDEX idx_template_version_log_updated_at ON template_version_log(updated_at DESC);


-- ============================================================================
-- Extend: soap_template_mappings
-- Add columns for dynamic function support
-- ============================================================================

ALTER TABLE soap_template_mappings
ADD COLUMN IF NOT EXISTS function_type varchar(50) DEFAULT 'DIRECT',
ADD COLUMN IF NOT EXISTS function_params jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

COMMENT ON COLUMN soap_template_mappings.function_type IS 'Transformation function (DIRECT, CONDITION, CONCAT, DATE, etc.)';
COMMENT ON COLUMN soap_template_mappings.function_params IS 'JSON parameters for the transformation function';
COMMENT ON COLUMN soap_template_mappings.description IS 'Human-readable description of this mapping';
COMMENT ON COLUMN soap_template_mappings.is_active IS 'Enable/disable this mapping without deleting';

-- ============================================================================
-- Extend: soap_product_mappings
-- Add columns for dynamic function support
-- ============================================================================

ALTER TABLE soap_product_mappings
ADD COLUMN IF NOT EXISTS function_type varchar(50) DEFAULT 'DIRECT',
ADD COLUMN IF NOT EXISTS function_params jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

COMMENT ON COLUMN soap_product_mappings.function_type IS 'Transformation function (DIRECT, CONDITION, CONCAT, DATE, etc.)';
COMMENT ON COLUMN soap_product_mappings.function_params IS 'JSON parameters for the transformation function';
COMMENT ON COLUMN soap_product_mappings.description IS 'Human-readable description of this mapping override';
COMMENT ON COLUMN soap_product_mappings.is_active IS 'Enable/disable this mapping without deleting';

-- ============================================================================
-- Table: soap_custom_functions
-- Purpose: Store user-defined custom transformation functions
-- ============================================================================

CREATE TABLE IF NOT EXISTS soap_custom_functions (
    id bigserial PRIMARY KEY,
    function_name varchar(100) UNIQUE NOT NULL,
    description text,
    code text NOT NULL,                      -- JavaScript code
    parameters jsonb DEFAULT '[]',           -- Expected parameters schema
    is_active boolean DEFAULT true,
    created_by varchar(100),
    created_date timestamp DEFAULT NOW(),
    updated_date timestamp DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_func_name ON soap_custom_functions(function_name);

COMMENT ON TABLE soap_custom_functions IS 'User-defined custom transformation functions';
COMMENT ON COLUMN soap_custom_functions.code IS 'JavaScript code for the transformation';
COMMENT ON COLUMN soap_custom_functions.parameters IS 'Expected parameters schema (JSON Schema)';

-- ============================================================================
-- Insert Sample Configuration Data (OPTIONAL - only if data doesn't exist)
-- Based on MAPPING_DOCUMENTATION.md Appendix C
-- Note: Skip this section if data already exists in bpm_soap_bocaller_parameters
-- ============================================================================

-- Uncomment below lines if you need to add sample data to existing table

/*
-- INSURED Salutation Mapping
INSERT INTO bpm_soap_bocaller_parameters (bpm_key, output, input, description) VALUES
('INSURED', 'นาย', '101', 'Mr.'),
('INSURED', 'นาง', '102', 'Mrs.'),
('INSURED', 'นางสาว', '103', 'Miss'),
('INSURED', 'เด็กชาย', '104', 'Boy'),
('INSURED', 'เด็กหญิง', '105', 'Girl')
ON CONFLICT (bpm_key, output, system_type) DO NOTHING;

-- BENEF Beneficiary Salutation
INSERT INTO bpm_soap_bocaller_parameters (bpm_key, output, input, description) VALUES
('BENEF', 'นาย', '01', 'Mr. (Beneficiary)'),
('BENEF', 'นาง', '02', 'Mrs. (Beneficiary)'),
('BENEF', 'นางสาว', '03', 'Miss (Beneficiary)')
ON CONFLICT (bpm_key, output, system_type) DO NOTHING;

-- RELATION Relationship Mapping
INSERT INTO bpm_soap_bocaller_parameters (bpm_key, output, input, description) VALUES
('RELATION', 'FATHER', '01', 'Father'),
('RELATION', 'MOTHER', '02', 'Mother'),
('RELATION', 'SPOUSE', '03', 'Spouse'),
('RELATION', 'CHILD', '04', 'Child'),
('RELATION', 'SIBLING', '05', 'Brother/Sister'),
('RELATION', 'OTHER', '99', 'Other')
ON CONFLICT (bpm_key, output, system_type) DO NOTHING;

-- MARISTATUS Marital Status
INSERT INTO bpm_soap_bocaller_parameters (bpm_key, output, input, description) VALUES
('MARISTATUS', 'SINGLE', 'S', 'Single'),
('MARISTATUS', 'MARRIED', 'M', 'Married'),
('MARISTATUS', 'DIVORCED', 'D', 'Divorced'),
('MARISTATUS', 'WIDOWED', 'W', 'Widowed')
ON CONFLICT (bpm_key, output, system_type) DO NOTHING;
*/

-- ============================================================================
-- Sample Custom Functions
-- ============================================================================

INSERT INTO soap_custom_functions (function_name, description, code, parameters) VALUES
(
    'getPaymentPlan',
    'Calculate payment plan code based on payment method and mode',
    '// Get payment plan code
const payment = data.eAPPDetails?.[0]?.Payment;
if (!payment) return "D000";

if (payment.PayMethod === "CREDITCARD") {
    if (payment.PayMode === "MONTHLY") {
        return "BI12";
    }
    if ((payment.PayMode === "ANNUAL" || payment.PayMode === "YEARLY") && payment.EtrNumber === "YES") {
        return "BI01";
    }
}
return "D000";',
    '[]'
),
(
    'getFullAddress',
    'Concatenate full Thai address from components',
    '// Build full address
const addr = data.address;
if (!addr) return "";

const parts = [];
if (addr.PlotNumber) parts.push(addr.PlotNumber);
if (addr.BuildingName) parts.push(addr.BuildingName);
if (addr.MooNumber) parts.push("ม." + addr.MooNumber);
if (addr.LaneSoi) parts.push("ซอย " + addr.LaneSoi);
if (addr.Road) parts.push("ถนน " + addr.Road);

return parts.join(" ");',
    '[{"name": "address", "type": "object", "description": "Address object"}]'
),
(
    'formatOccupationClass',
    'Format occupation class with special SW partner logic',
    '// Format occupation class
let occClass = data.occupationClass;

if (!occClass) return "00";

// Convert to string and pad left with zeros
occClass = String(occClass).padStart(2, "0");

// Special SW partner logic
if (data.partner === "SW" && !["01", "02", "03", "04"].includes(occClass)) {
    return "04"; // Default to 04 for invalid classes in SW
}

return occClass;',
    '[{"name": "occupationClass", "type": "string"}, {"name": "partner", "type": "string"}]'
)
ON CONFLICT (function_name) DO NOTHING;

-- ============================================================================
-- Views for Easier Querying
-- ============================================================================

-- View: All active template mappings with function details
CREATE OR REPLACE VIEW v_template_mappings_active AS
SELECT
    tm.id,
    tm.template_id,
    st.template_name,
    tm.xml_path,
    tm.json_field,
    tm.function_type,
    tm.function_params,
    tm.default_value,
    tm.description,
    tm.is_required,
    tm.parent_node
FROM soap_template_mappings tm
JOIN soap_templates st ON tm.template_id = st.id
WHERE tm.is_active = true;

-- View: All active product mappings with function details
CREATE OR REPLACE VIEW v_product_mappings_active AS
SELECT
    pm.id,
    pm.product_id,
    sp.product_name,
    pm.xml_path,
    pm.json_field,
    pm.function_type,
    pm.function_params,
    pm.default_value,
    pm.description,
    pm.is_required,
    pm.parent_node
FROM soap_product_mappings pm
JOIN soap_products sp ON pm.product_id = sp.id
WHERE pm.is_active = true;

-- View: Configuration summary
CREATE OR REPLACE VIEW v_config_summary AS
SELECT
    bpm_key,
    COUNT(*) as total_mappings
FROM bpm_soap_bocaller_parameters
GROUP BY bpm_key
ORDER BY bpm_key;

-- ============================================================================
-- Functions for Managing Mappings
-- ============================================================================

-- Function: Get merged mappings for a product (template + overrides)
CREATE OR REPLACE FUNCTION get_merged_mappings(p_product_id bigint)
RETURNS TABLE (
    xml_path varchar,
    json_field varchar,
    function_type varchar,
    function_params jsonb,
    default_value varchar,
    is_required boolean,
    parent_node varchar,
    source varchar,
    description text
) AS $$
BEGIN
    RETURN QUERY
    WITH template_maps AS (
        SELECT
            tm.xml_path,
            tm.json_field,
            tm.function_type,
            tm.function_params,
            tm.default_value,
            tm.is_required,
            tm.parent_node,
            'template' as source,
            tm.description
        FROM soap_template_mappings tm
        JOIN soap_products sp ON sp.template_id = tm.template_id
        WHERE sp.id = p_product_id
          AND tm.is_active = true
    ),
    product_maps AS (
        SELECT
            pm.xml_path,
            pm.json_field,
            pm.function_type,
            pm.function_params,
            pm.default_value,
            pm.is_required,
            pm.parent_node,
            'product' as source,
            pm.description
        FROM soap_product_mappings pm
        WHERE pm.product_id = p_product_id
          AND pm.is_active = true
    )
    SELECT DISTINCT ON (t.xml_path)
        COALESCE(p.xml_path, t.xml_path),
        COALESCE(p.json_field, t.json_field),
        COALESCE(p.function_type, t.function_type),
        COALESCE(p.function_params, t.function_params),
        COALESCE(p.default_value, t.default_value),
        COALESCE(p.is_required, t.is_required),
        COALESCE(p.parent_node, t.parent_node),
        COALESCE(p.source, t.source),
        COALESCE(p.description, t.description)
    FROM template_maps t
    FULL OUTER JOIN product_maps p ON t.xml_path = p.xml_path
    ORDER BY COALESCE(p.xml_path, t.xml_path), p.source NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_merged_mappings IS 'Get merged mappings (template + product overrides) for a product';

-- ============================================================================
-- Grant Permissions (adjust as needed)
-- ============================================================================

-- GRANT ALL ON soap_config_parameters TO your_app_user;
-- GRANT ALL ON soap_custom_functions TO your_app_user;
-- GRANT ALL ON v_template_mappings_active TO your_app_user;
-- GRANT ALL ON v_product_mappings_active TO your_app_user;
-- GRANT ALL ON v_config_summary TO your_app_user;

-- ============================================================================
-- Maintenance Queries
-- ============================================================================

-- Count mappings by function type
-- SELECT function_type, COUNT(*) FROM soap_template_mappings GROUP BY function_type;

-- Find mappings using a specific config key
-- SELECT * FROM soap_template_mappings WHERE function_params->>'configKey' = 'INSURED';

-- List all custom functions
-- SELECT function_name, description FROM soap_custom_functions WHERE is_active = true;

-- ============================================================================
-- End of Schema
-- ============================================================================
