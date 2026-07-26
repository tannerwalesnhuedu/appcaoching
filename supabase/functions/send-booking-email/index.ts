import { serve } from "https://deno.land"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Webhooks pass the updated row data inside the payload
  const { record } = await req.json() 

  // Only send an email if a client was just added to a booking
  if (!record.client_email) {
    return new Response("No email to send", { status: 200 })
  }

  const res = await fetch('https://resend.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Coaching Team <onboarding@resend.dev>',
      to: [record.client_email],
      subject: 'Appointment Secured! 🎉',
      html: `<strong>Your appointment on ${record.session_date} at ${record.session_time} is secured.</strong>`,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: 200 })
})
