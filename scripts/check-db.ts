// scripts/check-db.ts
import { prisma } from '../lib/prisma';

async function main() {
  try {
    console.log('Checking database connection...');
    
    // Try to query the database
    const guestCount = await prisma.guest.count();
    console.log(`Found ${guestCount} guests in the database.`);
    
    // Try to create a test guest
    const testGuest = await prisma.guest.create({
      data: {
        first_name: 'Test',
        last_name: 'User',
        email: `test-${Date.now()}@example.com`,
        code: '123456',
        code_expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    console.log('Successfully created test guest:', testGuest);
    
    // Clean up
    await prisma.guest.delete({
      where: { id: testGuest.id },
    });
    console.log('Successfully deleted test guest.');
    
    console.log('Database connection is working properly!');
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
