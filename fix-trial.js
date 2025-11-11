require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTrial() {
  try {
    console.log('🔍 Checking companies with expired trials...\n');

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        trialEndsAt: true,
        subscriptionStatus: true,
        subscriptionPlan: true
      }
    });

    console.log(`Found ${companies.length} companies:\n`);

    for (const company of companies) {
      const now = new Date();
      const trialEnd = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
      const isExpired = trialEnd && trialEnd < now;

      console.log(`📊 Company: ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Trial End: ${trialEnd ? trialEnd.toISOString() : 'N/A'}`);
      console.log(`   Status: ${company.subscriptionStatus}`);
      console.log(`   Plan: ${company.subscriptionPlan || 'None'}`);
      console.log(`   Expired: ${isExpired ? '❌ YES' : '✅ NO'}\n`);
    }

    // Fix: Extend trial for all companies by 90 days
    console.log('🔧 Extending trial period for all companies by 90 days...\n');

    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 90);

    const result = await prisma.company.updateMany({
      data: {
        trialEndsAt: newTrialEnd,
        subscriptionStatus: 'trial'
      }
    });

    console.log(`✅ Updated ${result.count} companies`);
    console.log(`   New trial end date: ${newTrialEnd.toISOString()}\n`);

    // Verify the update
    const updatedCompanies = await prisma.company.findMany({
      select: {
        name: true,
        trialEndsAt: true,
        subscriptionStatus: true
      }
    });

    console.log('📊 Updated companies:');
    updatedCompanies.forEach(c => {
      console.log(`   - ${c.name}: Trial until ${new Date(c.trialEndsAt).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrial();
