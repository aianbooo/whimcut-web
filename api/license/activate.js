const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CREEM_ACTIVATE_URL = 'https://api.creem.io/v1/licenses/activate';

function isValidId(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function extractInstanceId(data) {
  if (!data) return null;
  if (data.instance) {
    if (Array.isArray(data.instance)) {
      const last = data.instance[data.instance.length - 1];
      return (last && last.id) || null;
    }
    return data.instance.id || null;
  }
  return data.instance_id || null;
}

async function mapCreemError(res) {
  let message = '';
  try {
    message = JSON.stringify(await res.json()).toLowerCase();
  } catch {
    try {
      message = (await res.text()).toLowerCase();
    } catch {}
  }

  if (res.status === 404) {
    return { status: 404, code: 'license_invalid' };
  }
  if (res.status === 400) {
    const code = /limit|activation|instance|seat/.test(message)
      ? 'device_limit_reached'
      : 'license_invalid';
    return { status: 400, code };
  }
  if (res.status === 401) {
    return { status: 502, code: 'license_service_error' };
  }
  return { status: 502, code: 'license_service_error' };
}

module.exports = async function activate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const body = req.body || {};
  const licenseKey = body.license_key;
  const hardwareId = body.hardware_id;

  if (!isValidId(licenseKey) || !isValidId(hardwareId)) {
    return res.status(400).json({ success: false, error: 'invalid_request' });
  }

  const licenseKeyClean = licenseKey.trim();
  const hardwareIdClean = hardwareId.trim();

  try {
    const existing = await pool.query(
      'SELECT creem_instance_id FROM device_activations WHERE hardware_id = $1 AND license_key = $2',
      [hardwareIdClean, licenseKeyClean]
    );

    if (existing.rowCount > 0) {
      return res.status(200).json({
        success: true,
        instance_id: existing.rows[0].creem_instance_id,
        already_activated: true,
      });
    }

    let creemRes;
    try {
      creemRes = await fetch(CREEM_ACTIVATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': process.env.CREEM_API_KEY,
        },
        body: JSON.stringify({ key: licenseKeyClean, instance_name: hardwareIdClean }),
      });
    } catch {
      return res.status(503).json({ success: false, error: 'network_error' });
    }

    if (creemRes.ok) {
      const data = await creemRes.json();
      const instanceId = extractInstanceId(data);
      if (!instanceId) {
        return res.status(502).json({ success: false, error: 'license_service_error' });
      }

      await pool.query(
        'INSERT INTO device_activations (hardware_id, license_key, creem_instance_id) VALUES ($1, $2, $3) ON CONFLICT (hardware_id, license_key) DO NOTHING',
        [hardwareIdClean, licenseKeyClean, instanceId]
      );

      return res.status(200).json({
        success: true,
        instance_id: instanceId,
        already_activated: false,
      });
    }

    const mapped = await mapCreemError(creemRes);
    return res.status(mapped.status).json({ success: false, error: mapped.code });
  } catch (err) {
    console.error('activate failed:', err);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
};
