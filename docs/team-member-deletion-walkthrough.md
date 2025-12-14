# Team Member Deletion Walkthrough

I have implemented the team member deletion functionality. This allows organisation admins to remove members from the team, which also deletes their account from Clerk (allowing re-invitation).

## Changes

-   **Server Action**: Added `deleteMember` to `app/dashboard/team/actions.ts`.
    -   Verifies Admin role.
    -   Verifies target is in the same organisation.
    -   Prevents self-deletion.
    -   Deletes from Supabase database.
    -   Deletes from Clerk authentication provider.
-   **UI**: Updated `app/dashboard/team/page.tsx`.
    -   Added "Actions" column to the member table (visible only to Admins).
    -   Added "Delete" button (trash icon) for other members.

## Verification Steps

### 1. Verify Admin Access
1.  Log in as an **Admin**.
2.  Navigate to `/dashboard/team`.
3.  Ensure you see the **Actions** column.
4.  Ensure you see a **trash icon** next to other members.
5.  Ensure you **DO NOT** see the trash icon next to your own name.

### 2. Verify Member Deletion
1.  Identify a test member to delete (or invite a dummy account).
    > [!WARNING]
    > Deleting a member is permanent and removes their Clerk account.
2.  Click the **trash icon** next to the member.
3.  The page should reload, and the member should be removed from the list.
4.  (Optional) Try to log in with the deleted member's email to confirm the account is gone.

### 3. Verify Non-Admin Access
1.  Log in as a **Viewer** (or any non-admin role).
2.  Navigate to `/dashboard/team`.
3.  Ensure you **DO NOT** see the "Actions" column or any delete buttons.
