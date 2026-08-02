import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase'; // Adjust path to match your Supabase initialization client file

const bookingPayloadSchema = z.object({
  target_slot_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
  target_user_email: z.string().email(),
  price: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    // 🛡️ LAYER 1 DEFENSE: Supabase-Backed Serverless Rate Limiter
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    // Count how many times this IP has made a booking request in the last 60 seconds
    const { count, error: countError } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', ip)
      .gte('request_timestamp', oneMinuteAgo);

    if (countError) throw new Error('Rate limit check failed.');

    // If they hit the endpoint more than 5 times in a minute, block them immediately
    if (count && count >= 5) {
      return new Response("Too Many Requests. Take a breath!", { status: 429 });
    }

    // Log this current request into your tracking ledger
    await supabase.from('rate_limits').insert({ identifier: ip });

    // 🛡️ LAYER 2 DEFENSE: Schema Input Sanitation
    const rawBody = await request.json();
    const safePayload = bookingPayloadSchema.parse(rawBody);

    // 🛡️ LAYER 3 DEFENSE: Database Transaction Execution
    const { data: dbSuccess, error: dbError } = await supabase.rpc(
      'secure_reserve_appointment', 
      safePayload
    );

    if (dbError || !dbSuccess) {
      return NextResponse.json({ error: 'Reservation failed or conflict occurred.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload execution request' }, { status: 400 });
  }
}

// 🛡️ Add this DELETE method handler to your existing route.ts file
export async function DELETE(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { target_slot_id, target_user_id } = await request.json();

    // 1. Rate Limit Check: Limit cancellations to 3 per rolling hour per IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', `cancel_${ip}`)
      .gte('request_timestamp', oneHourAgo);

    if (count && count >= 3) {
      return new Response("Abuse detected. Maximum cancellation limit reached.", { status: 429 });
    }

    // Log this cancellation action to track spamming
    await supabase.from('rate_limits').insert({ identifier: `cancel_${ip}` });

    // 2. Fire the secure database validation operation
    const { data: success, error: dbError } = await supabase.rpc('secure_cancel_appointment', {
      target_slot_id,
      target_user_id
    });

    if (dbError || !success) {
      return NextResponse.json({ error: dbError?.message || 'Cancellation rejected.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Server handling exception' }, { status: 500 });
  }
}

