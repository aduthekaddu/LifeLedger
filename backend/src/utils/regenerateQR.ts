import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export const regenerateQRCodes = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Regenerating QR codes for patients...');

    const qrColumnExistsResult = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'qr_code'
        ) AS exists
      `
    );

    if (!qrColumnExistsResult.rows[0]?.exists) {
      logger.info('Skipping QR code regeneration: users.qr_code column does not exist in current schema');
      return;
    }

    // Find all patients (we'll update all to ensure UUID format)
    const result = await client.query(
      `SELECT id, email, first_name, last_name, qr_code FROM users 
       WHERE role = 'patient'`
    );

    if (result.rows.length === 0) {
      console.log('No patients found');
      return;
    }

    console.log(`Found ${result.rows.length} patient(s)`);

    // Generate new UUID QR codes for all patients
    for (const patient of result.rows) {
      const qrCode = uuidv4();
      await client.query(
        'UPDATE users SET qr_code = $1 WHERE id = $2',
        [qrCode, patient.id]
      );
      console.log(`✓ Generated new UUID QR code for ${patient.first_name} ${patient.last_name} (${patient.email})`);
      console.log(`  New QR Code: ${qrCode}`);
    }

    console.log('\n=================================');
    console.log('QR Codes Regenerated Successfully!');
    console.log('=================================\n');
    console.log('All patients now have UUID-format QR codes.');
    console.log('Patients should now log out and log back in to see their QR codes.\n');

    logger.info('QR codes regenerated for patients');
  } catch (error) {
    console.error('Error regenerating QR codes:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  regenerateQRCodes()
    .then(() => {
      console.log('QR code regeneration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('QR code regeneration failed:', error);
      process.exit(1);
    });
}
