import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const checkAndFixQR = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Checking QR codes in database...\n');

    // Get all patients
    const result = await client.query(
      `SELECT id, email, first_name, last_name, qr_code FROM users WHERE role = 'patient'`
    );

    console.log(`Found ${result.rows.length} patient(s):\n`);

    for (const patient of result.rows) {
      console.log(`Patient: ${patient.first_name} ${patient.last_name} (${patient.email})`);
      console.log(`  ID: ${patient.id}`);
      console.log(`  Current QR Code: ${patient.qr_code || 'NULL'}`);
      
      // Check if QR code is missing, empty, or in old base64 format
      const needsUpdate = !patient.qr_code || 
                         patient.qr_code === '' || 
                         patient.qr_code.startsWith('data:image/');
      
      if (needsUpdate) {
        const newQR = uuidv4();
        await client.query(
          'UPDATE users SET qr_code = $1 WHERE id = $2',
          [newQR, patient.id]
        );
        console.log(`  ✓ Generated new UUID QR code: ${newQR}`);
      } else {
        console.log(`  ✓ QR code is already in UUID format`);
      }
      console.log('');
    }

    console.log('Done! All patients now have UUID-format QR codes.');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
};

checkAndFixQR();
