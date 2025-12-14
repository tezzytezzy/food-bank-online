# Automating Session Status Updates

You asked how to automatically update session statuses (e.g., setting them to `open` when they start, or `completed` when they end).

The best tool for this in Supabase is **`pg_cron`**. It runs directly inside your database, meaning you don't need to deploy external functions or set up HTTP endpoints. It's fast, reliable, and perfectly suited for simple state updates like this.

## Option 1: The "Happy Path" (pg_cron)

This method uses a scheduled SQL job to check your `sessions` table every minute (or hour) and update rows based on the current time.

### 1. Enable the Extension
You need to enable `pg_cron` in your Supabase dashboard or via SQL.
```sql
create extension if not exists pg_cron;
```

### 2. Schedule the Job
Run this SQL command to create a job that runs **every minute**. This ensures statuses are updated almost instantly when the time comes.

```sql
select cron.schedule(
  'update-session-statuses', -- Job name
  '* * * * *',              -- Cron schedule (every minute)
  $$
    -- 1. Set 'scheduled' to 'open' if start_time has passed
    update sessions
    set status = 'open'
    where status = 'scheduled'
      and (session_date || ' ' || start_time)::timestamp <= now();

    -- 2. Set 'open' (or 'full') to 'completed' if end_time has passed
    -- Assuming duration is in minutes and we calculate end time
    update sessions
    set status = 'completed'
    where status in ('open', 'full')
      and (session_date || ' ' || start_time)::timestamp + (duration || ' minutes')::interval <= now();
  $$
);
```
*(Note: Adjust the logic if your `duration` is stored differently or if you have specific timezone handling needs based on your `session_date` storage. Supabase uses UTC by default.)*

### 3. Verify
You can check if the job is scheduled:
```sql
select * from cron.job;
```

---

## Option 2: Supabase Edge Functions + Cron

Use this if you need to do more than just update the database (e.g., send emails when a session opens, trigger webhooks, or complex logic).

### 1. Create the Function
Create a new Edge Function (e.g., `update-sessions`):
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Perform updates similar to the SQL above
  // Ideally call a stored procedure (RPC) for atomicity
  const { error } = await supabase.rpc('update_recurring_sessions') 
  
  return new Response("Updated", { status: 200 })
})
```

### 2. Schedule via Dashboard
1. Go to **Integrations** or **Edge Functions** in Supabase.
2. Enable **Cron Schedules** for your function.
3. Set the schedule to `* * * * *` (every minute).

---

## Recommendation
**Use Option 1 (`pg_cron`)**. It keeps the logic where the data is, has zero latency overhead, and costs nothing extra in terms of "invocations" (it's just CPU usage on the DB).
