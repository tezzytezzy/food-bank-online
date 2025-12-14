# End Time Feature Verification

This guide helps you verify the new "End Time" functionality for Templates and Sessions.

## Prerequisite: Apply Database Migration
Because this feature adds new columns, you must apply the SQL migration.
1.  If you have the Supabase CLI: Run `supabase migration up`.
2.  **OR** Run this SQL in your Supabase Dashboard SQL Editor:
    ```sql
    ALTER TABLE templates ADD COLUMN IF NOT EXISTS end_time TIME;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS end_time TIME;
    ```

## 1. Verify Numeric Template (Manual End Time)
1.  Navigate to `/dashboard/templates/create`.
2.  Select **Numeric** Ticket Type.
3.  Verify the **End Time** input is visible and **editable**.
4.  Set Start Time (e.g., `09:00`) and End Time (e.g., `17:00`).
5.  Fill in other required fields (Name, Max Tickets) and **Create**.
6.  **Expected**: Template is created successfully.

## 2. Verify Time-Allotted Template (Auto End Time)
1.  Navigate to `/dashboard/templates/create`.
2.  Select **Time-Allotted** Ticket Type.
3.  Set Start Time (e.g., `09:00`).
4.  Set **Slot Duration** (e.g., `30` mins) and **Total Slots** (e.g., `4`).
5.  **Expected**: The **End Time** input should automatically update to `11:00` (9:00 + 2 hours).
6.  **Expected**: The **End Time** input should be **disabled** (greyed out).
7.  **Create** the template.

## 3. Verify Session Creation
1.  Navigate to `/dashboard/sessions/create` (or wherever you create sessions).
2.  Select one of the templates you just created.
3.  Create the session.
4.  Check the database `sessions` table (or dashboard UI if visible).
5.  **Expected**: The new session should have the correct `end_time` saved.
