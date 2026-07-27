Deno.serve(async (req) => {
  try {
    // 1. Acknowledge the payload body from the Supabase Trigger
    const body = await req.json()
    
    // 2. Safely capture the newly updated or inserted database record row
    const record = body.record

    // 3. Extract the real customer details and times straight from your database columns
    // (Ensure these column names exactly match your Supabase appointments table spelling!)
    const customerEmail = record.client_email
    const appointmentDate = record.session_date
    const appointmentTime = record.session_time

    // 4. Fire the completely customized dynamic tracking email out to the client
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "Bookings <onboarding@resend.dev>",
        to: customerEmail, 
        subject: "Your Booking is Confirmed!",
        html: `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.5;">
            <h2>Booking Confirmed!</h2>
            <p>Hi there,</p>
            <p>Your upcoming coaching session has been locked into the system successfully.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>📅 Date:</strong> ${appointmentDate}</p>
            <p><strong>⏰ Time:</strong> ${appointmentTime}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p>Thank you for booking! See you soon.</p>
          </div>
        `,
      }),
    })

    const result = await resendResponse.json()
    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    })
  }
})
