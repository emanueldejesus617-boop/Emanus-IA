import { firestore } from "../db/db";

/**
 * Returns today's date string in YYYY-MM-DD format (UTC-based for consistency).
 */
export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Returns the ISO week string for the current week: "YYYY-W##"
 */
export function getWeekStr(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Check and increment a daily counter in Firestore for rate-limiting user actions.
 * Returns { allowed: true } if the user is within the limit, or { allowed: false, resetAt } if not.
 *
 * @param userId   - Firestore user ID
 * @param action   - e.g. "chat", "lesson", "exam"
 * @param maxCount - Maximum allowed uses per day (or per week if isWeekly=true)
 * @param isWeekly - If true, uses weekly window instead of daily
 */
export async function checkAndIncrementLimit(
  userId: string,
  action: string,
  maxCount: number,
  isWeekly = false
): Promise<{ allowed: boolean; used: number; max: number; resetAt?: string }> {
  const periodKey = isWeekly ? getWeekStr() : getTodayStr();
  const docId = `${userId}_${action}_${periodKey}`;
  const collection = "usage_limits";

  const docRef = firestore.collection(collection).doc(docId);
  const doc = await docRef.get();

  if (!doc.exists) {
    // First usage in this period
    await docRef.set({
      userId,
      action,
      period: periodKey,
      count: 1,
      isWeekly,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { allowed: true, used: 1, max: maxCount };
  }

  const data = doc.data()!;
  const currentCount = data.count || 0;

  if (currentCount >= maxCount) {
    // Calculate when the period resets
    let resetAt: string;
    if (isWeekly) {
      // Reset next Monday
      const now = new Date();
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      const resetDate = new Date(now);
      resetDate.setDate(now.getDate() + daysUntilMonday);
      resetDate.setHours(0, 0, 0, 0);
      resetAt = resetDate.toISOString();
    } else {
      // Reset at midnight UTC
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      resetAt = tomorrow.toISOString();
    }
    return { allowed: false, used: currentCount, max: maxCount, resetAt };
  }

  // Increment
  await docRef.update({
    count: currentCount + 1,
    updatedAt: new Date().toISOString(),
  });
  return { allowed: true, used: currentCount + 1, max: maxCount };
}

/**
 * Reports an error to Firestore so the admin can see it in the dashboard.
 */
export async function reportErrorToAdmin(params: {
  userId?: string;
  userEmail?: string;
  action: string;
  error: string;
  details?: any;
}): Promise<void> {
  try {
    const errorId = crypto.randomUUID();
    await firestore.collection("error_reports").doc(errorId).set({
      id: errorId,
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      action: params.action,
      error: params.error,
      details: params.details ? JSON.stringify(params.details) : null,
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  } catch (e) {
    // Silently fail - we don't want error reporting itself to cause issues
    console.error("[ErrorReporter] Failed to save error report:", e);
  }
}
