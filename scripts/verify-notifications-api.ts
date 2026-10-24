import {
  syncAdaptiveNotifications,
  getStudentNotifications,
  markNotificationAsRead,
  dismissNotification,
  markAllNotificationsAsRead,
} from "../lib/intelligence";

async function main() {
  console.log("=== Testing Notification Intelligence & API Logic ===");

  // 1. Sync notifications from current academic state
  console.log("1. Syncing adaptive notifications...");
  const syncResult = await syncAdaptiveNotifications();
  console.log(`   - Created: ${syncResult.createdCount}`);
  console.log(`   - Invalidated: ${syncResult.invalidatedCount}`);
  console.log(`   - Total Active: ${syncResult.notifications.length}`);
  console.log(`   - Digest Generated: ${syncResult.digest ? "YES (" + syncResult.digest.headline + ")" : "NO"}`);

  // 2. Fetch grouped notifications
  console.log("\n2. Fetching grouped notifications...");
  const grouped = await getStudentNotifications();
  console.log(`   - Unread Count: ${grouped.unreadCount}`);
  console.log(`   - Action Required: ${grouped.groups.actionRequired.length}`);
  console.log(`   - Changed: ${grouped.groups.changed.length}`);
  console.log(`   - Upcoming: ${grouped.groups.upcoming.length}`);
  console.log(`   - Insights: ${grouped.groups.insights.length}`);

  for (const notif of grouped.groups.actionRequired) {
    console.log(`     [ACTION REQUIRED] (${notif.urgency}) ${notif.title} -> why: ${notif.whyBullets.join(" | ")}`);
  }
  for (const notif of grouped.groups.changed) {
    console.log(`     [CHANGED] (${notif.urgency}) ${notif.title} -> why: ${notif.whyBullets.join(" | ")}`);
  }
  for (const notif of grouped.groups.upcoming) {
    console.log(`     [UPCOMING] (${notif.urgency}) ${notif.title} -> why: ${notif.whyBullets.join(" | ")}`);
  }
  for (const notif of grouped.groups.insights) {
    console.log(`     [INSIGHTS] (${notif.urgency}) ${notif.title}`);
  }

  // 3. Test mark as read
  if (grouped.all.length > 0) {
    const target = grouped.all[0];
    console.log(`\n3. Marking notification ${target.id} as read...`);
    const readSuccess = await markNotificationAsRead(target.id);
    console.log(`   - Mark Read Success: ${readSuccess}`);
  }

  // 4. Test idempotence: running sync again should create 0 duplicates!
  console.log("\n4. Testing Idempotent Sync (Deduplication)...");
  const secondSync = await syncAdaptiveNotifications();
  console.log(`   - Created on second sync: ${secondSync.createdCount} (Expected: 0)`);
  if (secondSync.createdCount === 0) {
    console.log("   ✅ Deduplication PASSED: 0 duplicate notifications created.");
  } else {
    console.error("   ❌ Deduplication FAILED: unexpected duplicate notifications created!");
  }

  console.log("\n=== Notification API Logic Verification Complete ===");
}

main().catch(console.error);
