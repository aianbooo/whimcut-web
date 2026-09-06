const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function creemApiBaseUrl() {
  const key = process.env.CREEM_API_KEY || '';
  return key.startsWith('creem_test_') ? 'https://test-api.creem.io/v1' : 'https://api.creem.io/v1';
}

const CREEM_VALIDATE_URL = `${creemApiBaseUrl()}/licenses/validate`;

function isValidId(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

module.exports = async function validate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, reason: 'method_not_allowed' });
  }

  const body = req.body || {};
  const licenseKey = body.license_key;
  const hardwareId = body.hardware_id;

  if (!isValidId(licenseKey) || !isValidId(hardwareId)) {
    return res.status(400).json({ valid: false, reason: 'invalid_request' });
  }

  const licenseKeyClean = licenseKey.trim();
  const hardwareIdClean = hardwareId.trim();

  try {
    const existing = await pool.query(
      'SELECT creem_instance_id FROM device_activations WHERE hardware_id = $1 AND license_key = $2',
      [hardwareIdClean, licenseKeyClean]
    );

    if (existing.rowCount === 0) {
      return res.status(200).json({ valid: false, reason: 'not_activated' });
    }

    const instanceId = existing.rows[0].creem_instance_id;

    let creemRes;
    try {
      creemRes = await fetch(CREEM_VALIDATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': process.env.CREEM_API_KEY,
        },
        body: JSON.stringify({ key: licenseKeyClean, instance_id: instanceId }),
      });
    } catch {
      return res.status(503).json({ valid: false, reason: 'network_error' });
    }

    if (creemRes.ok) {
      const data = await creemRes.json();
      if (data && data.status === 'active') {
        return res.status(200).json({ valid: true });
      }
      const status = data && data.status ? data.status : 'inactive';
      return res.status(200).json({ valid: false, reason: `license_${status}` });
    }

    if (creemRes.status === 404) {
      return res.status(200).json({ valid: false, reason: 'license_invalid' });
    }
    return res.status(502).json({ valid: false, reason: 'license_service_error' });
  } catch (err) {
    console.error('validate failed:', err);
    return res.status(500).json({ valid: false, reason: 'internal_error' });
  }
};
