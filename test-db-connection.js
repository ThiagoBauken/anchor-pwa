#!/usr/bin/env node

// Test database connection
require('dotenv').config();

console.log('=== Environment Variables Check ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('POSTGRES_HOST_EXTERNAL:', process.env.POSTGRES_HOST_EXTERNAL);
console.log('POSTGRES_PORT_EXTERNAL:', process.env.POSTGRES_PORT_EXTERNAL);
console.log('\n=== Attempting Connection ===');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing connection to:', process.env.DATABASE_URL);

    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('\n✅ SUCCESS! Connected to database:');
    console.log(result);

    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `;
    console.log('\n📊 First 10 tables:');
    console.log(tables);

  } catch (error) {
    console.error('\n❌ ERROR connecting to database:');
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
