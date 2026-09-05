const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS device_activations (
  id SERIAL PRIMARY KEY,
  hardware_id TEXT NOT NULL,
  license_key TEXT NOT NULL,
  creem_instance_id TEXT NOT NULL,
  activated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(hardware_id, license_key)
);
`;

module.exports = async function initDb(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  try {
    await pool.query(CREATE_TABLE_SQL);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('init-db failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
