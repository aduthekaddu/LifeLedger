import pool from '../config/database';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    // Check if users already exist
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('Database already has users. Skipping seed.');
      return;
    }

    console.log('Seeding database with test accounts...');

    // Hash password for all test accounts
    const password = 'Test@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Admin
    await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, phone_number, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['admin@medsecure.com', hashedPassword, 'Admin', 'User', 'admin', '+1234567890', true]
    );
    console.log('✓ Created Admin account');

    // Create Doctor
    await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, phone_number, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['doctor@medsecure.com', hashedPassword, 'Dr. John', 'Smith', 'doctor', '+1234567891', true]
    );
    console.log('✓ Created Doctor account');

    // Create Patient with QR code
    const qrCode = uuidv4(); // Store just the UUID
    
    await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, phone_number, date_of_birth, address, emergency_contact, qr_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        'patient@medsecure.com',
        hashedPassword,
        'Jane',
        'Doe',
        'patient',
        '+1234567892',
        '1990-01-15',
        '123 Main St, City, State 12345',
        'Emergency Contact: +1234567893',
        qrCode,
        true
      ]
    );
    console.log('✓ Created Patient account');

    console.log('\n=================================');
    console.log('Test Accounts Created Successfully!');
    console.log('=================================\n');
    console.log('Admin Account:');
    console.log('  Email: admin@medsecure.com');
    console.log('  Password: Test@123456\n');
    console.log('Doctor Account:');
    console.log('  Email: doctor@medsecure.com');
    console.log('  Password: Test@123456\n');
    console.log('Patient Account:');
    console.log('  Email: patient@medsecure.com');
    console.log('  Password: Test@123456\n');
    console.log('=================================\n');

    logger.info('Database seeded with test accounts');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
