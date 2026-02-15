import pool from '../config/database';

async function migrateDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database migration for blockchain and IPFS...');

    // Add ipfs_cid column to medical_records
    await client.query(`
      ALTER TABLE medical_records 
      ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(100);
    `);
    console.log('✅ Added ipfs_cid column');

    // Add ai_insights column to medical_records
    await client.query(`
      ALTER TABLE medical_records 
      ADD COLUMN IF NOT EXISTS ai_insights TEXT;
    `);
    console.log('✅ Added ai_insights column');

    // Add blockchain_tx column to access_logs
    await client.query(`
      ALTER TABLE access_logs 
      ADD COLUMN IF NOT EXISTS blockchain_tx VARCHAR(100);
    `);
    console.log('✅ Added blockchain_tx column to access_logs');

    // Add blockchain_tx column to access_requests
    await client.query(`
      ALTER TABLE access_requests 
      ADD COLUMN IF NOT EXISTS blockchain_tx VARCHAR(100);
    `);
    console.log('✅ Added blockchain_tx column to access_requests');

    // Create index on ipfs_cid for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_medical_records_ipfs_cid 
      ON medical_records(ipfs_cid);
    `);
    console.log('✅ Created index on ipfs_cid');

    // Create index on blockchain_tx for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_access_logs_blockchain_tx 
      ON access_logs(blockchain_tx);
    `);
    console.log('✅ Created index on blockchain_tx');

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
