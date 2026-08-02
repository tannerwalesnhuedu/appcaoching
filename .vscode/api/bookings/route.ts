import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase'; // Adjust path to match your Supabase initialization client file

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

export async function DELETE(request: Request) {
    try {
        const { target_slot_id } = await request.json();

        if (!target_slot_id) {
            return new Response(JSON.stringify({ error: "Missing slot ID" }), { status: 400 });
        }

        // 💥 FORCE THE UPDATE DIRECTLY HERE
        const { error: updateError } = await supabase
            .from('appointments') // 🚨 Double-check if your table name is 'appointments' or 'bookings'
            .update({
                is_booked: false,
                user_id: null,
                client_email: null
            })
            .eq('id', target_slot_id);

        if (updateError) {
            console.error("Supabase error:", updateError);
            return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

