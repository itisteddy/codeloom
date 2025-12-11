#!/usr/bin/env ts-node

/**
 * CLI script to create a new tenant (Organization + Practice + Subscription + Admin User)
 * 
 * Usage:
 *   pnpm create-tenant --org-name "Sunrise Primary Care LLC" \
 *     --practice-name "Sunrise Primary Care" \
 *     --admin-email "owner@sunrisepeds.com" \
 *     --plan-type STARTER \
 *     --billing-cycle MONTHLY
 */

import { createTenant, CreateTenantOptions } from '../src/services/tenancy';
import { PlanType, BillingCycle, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../src/db/client';

// Parse command line arguments
function parseArgs(): CreateTenantOptions {
  const args = process.argv.slice(2);
  const options: Partial<CreateTenantOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--org-name':
        if (!nextArg) {
          console.error('Error: --org-name requires a value');
          process.exit(1);
        }
        options.orgName = nextArg;
        i++;
        break;

      case '--practice-name':
        if (!nextArg) {
          console.error('Error: --practice-name requires a value');
          process.exit(1);
        }
        options.practiceName = nextArg;
        i++;
        break;

      case '--admin-email':
        if (!nextArg) {
          console.error('Error: --admin-email requires a value');
          process.exit(1);
        }
        options.adminEmail = nextArg;
        i++;
        break;

      case '--admin-name':
        if (!nextArg) {
          console.error('Error: --admin-name requires a value');
          process.exit(1);
        }
        options.adminName = nextArg;
        i++;
        break;

      case '--plan-type':
        if (!nextArg) {
          console.error('Error: --plan-type requires a value');
          process.exit(1);
        }
        const planType = nextArg.toLowerCase() as PlanType;
        if (!Object.values(PlanType).includes(planType)) {
          console.error(`Error: Invalid plan-type. Must be one of: ${Object.values(PlanType).join(', ')}`);
          process.exit(1);
        }
        options.planType = planType;
        i++;
        break;

      case '--billing-cycle':
        if (!nextArg) {
          console.error('Error: --billing-cycle requires a value');
          process.exit(1);
        }
        const billingCycle = nextArg.toLowerCase() as BillingCycle;
        if (!Object.values(BillingCycle).includes(billingCycle)) {
          console.error(`Error: Invalid billing-cycle. Must be one of: ${Object.values(BillingCycle).join(', ')}`);
          process.exit(1);
        }
        options.billingCycle = billingCycle;
        i++;
        break;

      case '--status':
        if (!nextArg) {
          console.error('Error: --status requires a value');
          process.exit(1);
        }
        const status = nextArg.toLowerCase() as SubscriptionStatus;
        if (!Object.values(SubscriptionStatus).includes(status)) {
          console.error(`Error: Invalid status. Must be one of: ${Object.values(SubscriptionStatus).join(', ')}`);
          process.exit(1);
        }
        options.status = status;
        i++;
        break;

      case '--specialty':
        if (!nextArg) {
          console.error('Error: --specialty requires a value');
          process.exit(1);
        }
        options.specialty = nextArg;
        i++;
        break;

      case '--time-zone':
        if (!nextArg) {
          console.error('Error: --time-zone requires a value');
          process.exit(1);
        }
        options.timeZone = nextArg;
        i++;
        break;

      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;

      default:
        console.error(`Error: Unknown argument: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  // Validate required arguments
  if (!options.orgName) {
    console.error('Error: --org-name is required');
    printUsage();
    process.exit(1);
  }

  if (!options.adminEmail) {
    console.error('Error: --admin-email is required');
    printUsage();
    process.exit(1);
  }

  return options as CreateTenantOptions;
}

function printUsage() {
  console.log(`
Usage: pnpm create-tenant [options]

Required:
  --org-name <name>          Organization name (e.g., "Sunrise Primary Care LLC")
  --admin-email <email>      Admin user email (e.g., "owner@sunrisepeds.com")

Optional:
  --practice-name <name>     Practice name (defaults to org-name)
  --admin-name <name>        Admin user full name (defaults to "Admin User")
  --plan-type <type>         Plan type: STARTER, GROWTH, or ENTERPRISE (default: STARTER)
  --billing-cycle <cycle>    Billing cycle: MONTHLY or ANNUAL (default: MONTHLY)
  --status <status>          Subscription status: ACTIVE, TRIALING, CANCELED, PAST_DUE (default: ACTIVE)
  --specialty <specialty>    Practice specialty (optional)
  --time-zone <timezone>     Practice timezone (default: "America/Chicago")
  --help, -h                 Show this help message

Examples:
  pnpm create-tenant \\
    --org-name "Sunrise Primary Care LLC" \\
    --practice-name "Sunrise Primary Care" \\
    --admin-email "owner@sunrisepeds.com" \\
    --plan-type STARTER \\
    --billing-cycle MONTHLY

  pnpm create-tenant \\
    --org-name "Metro Cardiology Group" \\
    --admin-email "admin@metrocards.com" \\
    --admin-name "Dr. Jane Smith" \\
    --plan-type GROWTH \\
    --specialty "cardiology"
`);
}

async function main() {
  try {
    const options = parseArgs();

    console.log('Creating tenant...');
    console.log('Options:', {
      orgName: options.orgName,
      practiceName: options.practiceName || options.orgName,
      adminEmail: options.adminEmail,
      planType: options.planType || 'STARTER',
      billingCycle: options.billingCycle || 'MONTHLY',
    });

    const result = await createTenant(options);

    console.log('\n✅ Tenant created successfully!\n');
    console.log('Summary:');
    console.log(`  Organization: ${result.org.name} (id: ${result.org.id})`);
    console.log(`  Practice: ${result.practice.name} (id: ${result.practice.id})`);
    console.log(`  Plan: ${result.subscription.planType.toUpperCase()} / ${result.subscription.billingCycle.toUpperCase()}`);
    console.log(`  Status: ${result.subscription.status.toUpperCase()}`);
    console.log(`  Admin User: ${result.adminUser.email} (id: ${result.adminUser.id})`);
    console.log(`  Admin Name: ${result.adminUser.firstName} ${result.adminUser.lastName}`);
    console.log(`  PracticeUser: ${result.practiceUser.id} (role: ${result.practiceUser.role}, status: ${result.practiceUser.status})`);
    console.log(`  Usage Period: ${result.usage.periodStart.toISOString().split('T')[0]} to ${result.usage.periodEnd.toISOString().split('T')[0]}`);

    const defaultPassword = process.env.DEFAULT_TENANT_ADMIN_PASSWORD || 'changeme123';
    console.log(`\n⚠️  Default admin password: ${defaultPassword}`);
    console.log('   The admin should reset their password via the password reset flow.');
    console.log('   (Set DEFAULT_TENANT_ADMIN_PASSWORD env var to customize)');

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('\n❌ Failed to create tenant:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

