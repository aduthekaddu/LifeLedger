import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

type UserInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dob?: string;
  address?: string;
  emergency?: string;
};

export const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    const getNextPatientId = async (year: number) => {
      const pattern = `^PT-${year}-(\\d+)$`;
      const result = await client.query(
        `
          SELECT COALESCE(MAX((regexp_match(patient_id, $1))[1]::INTEGER), 0) AS max_serial
          FROM users
          WHERE role = 'patient' AND patient_id ~ $1
        `,
        [pattern]
      );

      const nextSerial = Number(result.rows[0]?.max_serial || 0) + 1;
      return `PT-${year}-${String(nextSerial).padStart(4, '0')}`;
    };

    const usersColumnsResult = await client.query(
      `
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
      `
    );

    const usersColumns = new Map(
      usersColumnsResult.rows.map((row: { column_name: string; data_type: string; column_default: string | null }) => [
        row.column_name,
        { dataType: row.data_type, columnDefault: row.column_default },
      ])
    );

    const hasColumn = (columnName: string) => usersColumns.has(columnName);

    const passwordColumn = hasColumn('password_hash')
      ? 'password_hash'
      : hasColumn('password')
      ? 'password'
      : null;

    if (!passwordColumn) {
      throw new Error('Cannot seed users: neither password_hash nor password column exists on users table');
    }

    const phoneColumn = hasColumn('phone')
      ? 'phone'
      : hasColumn('phone_number')
      ? 'phone_number'
      : null;

    const formatAddress = (address: string | undefined) => {
      if (!address || !hasColumn('address')) return undefined;
      const addressType = usersColumns.get('address')?.dataType;
      if (addressType === 'json' || addressType === 'jsonb') {
        return { full_address: address };
      }
      return address;
    };

    const formatEmergencyContact = (emergency: string | undefined) => {
      if (!emergency || !hasColumn('emergency_contact')) return undefined;
      const emergencyType = usersColumns.get('emergency_contact')?.dataType;
      if (emergencyType === 'json' || emergencyType === 'jsonb') {
        return { primary_contact: emergency };
      }
      return emergency;
    };

    const buildUserRow = (
      user: UserInput,
      role: 'admin' | 'doctor' | 'patient',
      hashedPassword: string,
      index?: number
    ) => {
      const userRow: Record<string, unknown> = {
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role,
      };

      if (passwordColumn) {
        userRow[passwordColumn] = hashedPassword;
      }

      if (phoneColumn && user.phone) {
        userRow[phoneColumn] = user.phone;
      }

      if (hasColumn('date_of_birth') && user.dob) {
        userRow.date_of_birth = user.dob;
      }

      const formattedAddress = formatAddress(user.address);
      if (formattedAddress !== undefined) {
        userRow.address = formattedAddress;
      }

      const formattedEmergencyContact = formatEmergencyContact(user.emergency);
      if (formattedEmergencyContact !== undefined) {
        userRow.emergency_contact = formattedEmergencyContact;
      }

      if (hasColumn('is_active')) {
        userRow.is_active = true;
      }

      if (hasColumn('email_verified')) {
        userRow.email_verified = true;
      }

      if (hasColumn('mfa_enabled')) {
        userRow.mfa_enabled = false;
      }

      if (hasColumn('qr_code') && role === 'patient') {
        userRow.qr_code = uuidv4();
      }

      if (hasColumn('patient_id') && role === 'patient' && typeof index === 'number') {
        userRow.patient_id = undefined;
      }

      if (
        hasColumn('id') &&
        usersColumns.get('id')?.dataType === 'uuid' &&
        !usersColumns.get('id')?.columnDefault
      ) {
        userRow.id = uuidv4();
      }

      return userRow;
    };

    const insertUser = async (userRow: Record<string, unknown>) => {
      const entries = Object.entries(userRow).filter(([, value]) => value !== undefined);
      const columns = entries.map(([key]) => key);
      const values = entries.map(([, value]) => value);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const result = await client.query(
        `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (email) DO NOTHING RETURNING id, created_at`,
        values
      );

      return result.rows[0] || null;
    };

    console.log('Seeding database with missing test accounts...');

    // Hash password for all test accounts
    const password = 'Test@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUsers = [
      {
        email: 'admin@lifeledger.com',
        firstName: 'Rohit',
        lastName: 'Sharma',
        phone: '+919800000001'
      },
      {
        email: 'priya.mehta@lifeledger.com',
        firstName: 'Priya',
        lastName: 'Mehta',
        phone: '+919800000002'
      },
      {
        email: 'kunal.verma@lifeledger.com',
        firstName: 'Kunal',
        lastName: 'Verma',
        phone: '+919800000003'
      },
      {
        email: 'swati.nair@lifeledger.com',
        firstName: 'Swati',
        lastName: 'Nair',
        phone: '+919800000004'
      },
      {
        email: 'aman.saxena@lifeledger.com',
        firstName: 'Aman',
        lastName: 'Saxena',
        phone: '+919800000005'
      },
      {
        email: 'farah.qureshi@lifeledger.com',
        firstName: 'Farah',
        lastName: 'Qureshi',
        phone: '+919800000006'
      }
    ];

    let createdAdmins = 0;
    for (const admin of adminUsers) {
      const userRow = buildUserRow(admin, 'admin', hashedPassword);
      const created = await insertUser(userRow);
      if (created) createdAdmins++;
    }
    console.log(`✓ Created ${createdAdmins} Admin accounts (${adminUsers.length - createdAdmins} already existed)`);

    const doctorUsers = [
      {
        email: 'aditya.singh@lifeledger.com',
        firstName: 'Aditya',
        lastName: 'Singh',
        phone: '+919810000001'
      },
      {
        email: 'aditya.srivastava@lifeledger.com',
        firstName: 'Aditya',
        lastName: 'Srivastava',
        phone: '+919810000002'
      },
      {
        email: 'ankit.ojha@lifeledger.com',
        firstName: 'Ankit',
        lastName: 'Ojha',
        phone: '+919810000003'
      },
      {
        email: 'afreen.laiq@lifeledger.com',
        firstName: 'Afreen',
        lastName: 'Laiq',
        phone: '+919810000004'
      },
      {
        email: 'neha.kapoor@lifeledger.com',
        firstName: 'Neha',
        lastName: 'Kapoor',
        phone: '+919810000005'
      },
      {
        email: 'rahul.iyer@lifeledger.com',
        firstName: 'Rahul',
        lastName: 'Iyer',
        phone: '+919810000006'
      },
      {
        email: 'dr.sneha.patel@lifeledger.com',
        firstName: 'Sneha',
        lastName: 'Patel',
        phone: '+919810000007'
      },
      {
        email: 'vivek.chaturvedi@lifeledger.com',
        firstName: 'Vivek',
        lastName: 'Chaturvedi',
        phone: '+919810000008'
      },
      {
        email: 'pooja.arora@lifeledger.com',
        firstName: 'Pooja',
        lastName: 'Arora',
        phone: '+919810000009'
      },
      {
        email: 'harsh.vardhan@lifeledger.com',
        firstName: 'Harsh',
        lastName: 'Vardhan',
        phone: '+919810000010'
      },
      {
        email: 'dr.tanvi.joshi@lifeledger.com',
        firstName: 'Tanvi',
        lastName: 'Joshi',
        phone: '+919810000011'
      },
      {
        email: 'siddharth.menon@lifeledger.com',
        firstName: 'Siddharth',
        lastName: 'Menon',
        phone: '+919810000012'
      }
    ];

    let createdDoctors = 0;
    for (const doctor of doctorUsers) {
      const userRow = buildUserRow(doctor, 'doctor', hashedPassword);
      const created = await insertUser(userRow);
      if (created) createdDoctors++;
    }
    console.log(`✓ Created ${createdDoctors} Doctor accounts (${doctorUsers.length - createdDoctors} already existed)`);

    const patientUsers = [
      {
        email: 'patient@lifeledger.com',
        firstName: 'Aarav',
        lastName: 'Gupta',
        phone: '+919820000001',
        dob: '1994-03-12',
        address: 'Sector 62, Noida, Uttar Pradesh',
        emergency: 'Emergency Contact: +919830000001'
      },
      {
        email: 'riya.shah@lifeledger.com',
        firstName: 'Riya',
        lastName: 'Shah',
        phone: '+919820000002',
        dob: '1998-07-21',
        address: 'Andheri West, Mumbai, Maharashtra',
        emergency: 'Emergency Contact: +919830000002'
      },
      {
        email: 'mohit.yadav@lifeledger.com',
        firstName: 'Mohit',
        lastName: 'Yadav',
        phone: '+919820000003',
        dob: '1989-11-02',
        address: 'Indiranagar, Bengaluru, Karnataka',
        emergency: 'Emergency Contact: +919830000003'
      },
      {
        email: 'sana.khan@lifeledger.com',
        firstName: 'Sana',
        lastName: 'Khan',
        phone: '+919820000004',
        dob: '1996-05-09',
        address: 'Banjara Hills, Hyderabad, Telangana',
        emergency: 'Emergency Contact: +919830000004'
      },
      {
        email: 'vivek.mishra@lifeledger.com',
        firstName: 'Vivek',
        lastName: 'Mishra',
        phone: '+919820000005',
        dob: '1992-10-30',
        address: 'Aliganj, Lucknow, Uttar Pradesh',
        emergency: 'Emergency Contact: +919830000005'
      },
      {
        email: 'nisha.reddy@lifeledger.com',
        firstName: 'Nisha',
        lastName: 'Reddy',
        phone: '+919820000006',
        dob: '2000-01-16',
        address: 'Madhapur, Hyderabad, Telangana',
        emergency: 'Emergency Contact: +919830000006'
      },
      {
        email: 'arjun.malhotra@lifeledger.com',
        firstName: 'Arjun',
        lastName: 'Malhotra',
        phone: '+919820000007',
        dob: '1987-08-14',
        address: 'Rohini, Delhi',
        emergency: 'Emergency Contact: +919830000007'
      },
      {
        email: 'meera.naidu@lifeledger.com',
        firstName: 'Meera',
        lastName: 'Naidu',
        phone: '+919820000008',
        dob: '1995-06-04',
        address: 'Besant Nagar, Chennai, Tamil Nadu',
        emergency: 'Emergency Contact: +919830000008'
      },
      {
        email: 'karan.bose@lifeledger.com',
        firstName: 'Karan',
        lastName: 'Bose',
        phone: '+919820000009',
        dob: '1988-12-19',
        address: 'Salt Lake, Kolkata, West Bengal',
        emergency: 'Emergency Contact: +919830000009'
      },
      {
        email: 'ananya.das@lifeledger.com',
        firstName: 'Ananya',
        lastName: 'Das',
        phone: '+919820000010',
        dob: '1999-02-11',
        address: 'Patia, Bhubaneswar, Odisha',
        emergency: 'Emergency Contact: +919830000010'
      },
      {
        email: 'rakesh.tripathi@lifeledger.com',
        firstName: 'Rakesh',
        lastName: 'Tripathi',
        phone: '+919820000011',
        dob: '1991-09-03',
        address: 'Civil Lines, Prayagraj, Uttar Pradesh',
        emergency: 'Emergency Contact: +919830000011'
      },
      {
        email: 'simran.grewal@lifeledger.com',
        firstName: 'Simran',
        lastName: 'Grewal',
        phone: '+919820000012',
        dob: '1997-04-26',
        address: 'Model Town, Ludhiana, Punjab',
        emergency: 'Emergency Contact: +919830000012'
      }
    ];

    let createdPatients = 0;
    for (let index = 0; index < patientUsers.length; index++) {
      const patient = patientUsers[index];
      const userRow = buildUserRow(patient, 'patient', hashedPassword, index);
      const created = await insertUser(userRow);
      if (created) {
        createdPatients++;

        if (hasColumn('patient_id')) {
          const year = new Date(created.created_at || Date.now()).getFullYear();
          const patientId = await getNextPatientId(year);
          await client.query('UPDATE users SET patient_id = $1 WHERE id = $2', [patientId, created.id]);
        }
      }
    }
    console.log(`✓ Created ${createdPatients} Patient accounts (${patientUsers.length - createdPatients} already existed)`);

    console.log('\n=================================');
    console.log('Test Accounts Created Successfully!');
    console.log('=================================\n');
    console.log(`Admins (new): ${createdAdmins}`);
    console.log(`Doctors (new): ${createdDoctors}`);
    console.log(`Patients (new): ${createdPatients}`);
    console.log('Default password for all accounts: Test@123456\n');
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
