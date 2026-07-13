import twilio from "twilio"

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const apiKeySid = process.env.TWILIO_API_KEY_SID
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
    if (!accountSid || !apiKeySid || !apiKeySecret) return null
    client = twilio(apiKeySid, apiKeySecret, { accountSid })
  }
  return client
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const c = getClient()
  if (!c) {
    console.log(`[sms mock] To: ${to} | Body: ${body}`)
    return true
  }
  try {
    await c.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body,
    })
    return true
  } catch (err) {
    console.error("[twilio error]", err)
    return false
  }
}
