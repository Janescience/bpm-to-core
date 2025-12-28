-- Fix getFullAddress custom function to use params instead of data
-- Run this with: psql -U postgres -d bpm_soap -f fix-getFullAddress.sql

UPDATE soap_custom_functions
SET code = '// Build full address
const addr = params.address;
if (!addr) return "";

const parts = [];
if (addr.PlotNumber) parts.push(addr.PlotNumber);
if (addr.BuildingName) parts.push(addr.BuildingName);
if (addr.MooNumber) parts.push("ม." + addr.MooNumber);
if (addr.LaneSoi) parts.push("ซอย " + addr.LaneSoi);
if (addr.Road) parts.push("ถนน " + addr.Road);

return parts.join(" ");'
WHERE function_name = 'getFullAddress';

-- Verify the update
SELECT function_name, code FROM soap_custom_functions WHERE function_name = 'getFullAddress';
