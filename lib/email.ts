import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  colorName?: string;
}

export async function sendOrderConfirmationEmail(orderDetails: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  shippingFee: number;
  paymentMethod: string;
  items: OrderItem[];
  shippingAddress: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not found. Skipping email sending.')
    return
  }

  const itemsHtml = orderDetails.items.map(item => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #eaeaea;">
        <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1d1d1f;">${item.name}</p>
        ${item.colorName ? `<p style="margin: 4px 0 0; font-size: 14px; color: #86868b;">Color: ${item.colorName}</p>` : ''}
        <p style="margin: 4px 0 0; font-size: 14px; color: #86868b;">Qty: ${item.quantity}</p>
      </td>
      <td style="padding: 16px 0; border-bottom: 1px solid #eaeaea; text-align: right;">
        <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1d1d1f;">₹${item.price.toLocaleString('en-IN')}</p>
      </td>
    </tr>
  `).join('')

  const mailOptions = {
    from: `"Outflank" <${process.env.SMTP_USER}>`,
    to: orderDetails.customerEmail,
    subject: `Order Confirmation - Outflank #${orderDetails.orderId.slice(0, 8)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f5f5f7; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); max-width: 600px; margin: 0 auto;">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #eaeaea;">
                    <img src="https://outflank.in/logo/outflank-logo.png" alt="Outflank Logo" style="height: 48px; width: auto; margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto;" />
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.5px;">Thank you for your order.</h1>
                    <p style="margin: 12px 0 0; font-size: 16px; color: #86868b; line-height: 1.5;">Hi ${orderDetails.customerName}, we've successfully received your order and we're getting it ready.</p>
                  </td>
                </tr>

                <!-- Order Details -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                      <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #86868b; text-transform: uppercase; letter-spacing: 1px;">Tracking ID</h3>
                      <span style="font-size: 16px; font-weight: 700; color: #1d1d1f; background-color: #f5f5f7; padding: 6px 12px; border-radius: 6px;">${orderDetails.orderId.split('-')[0].toUpperCase()}</span>
                    </div>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      ${itemsHtml}
                    </table>

                    <!-- Summary -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                      <tr>
                        <td style="padding: 8px 0; color: #86868b; font-size: 15px;">Subtotal</td>
                        <td style="padding: 8px 0; text-align: right; color: #1d1d1f; font-size: 15px;">₹${(orderDetails.amount - orderDetails.shippingFee).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #86868b; font-size: 15px;">Shipping</td>
                        <td style="padding: 8px 0; text-align: right; color: #1d1d1f; font-size: 15px;">${orderDetails.shippingFee > 0 ? `₹${orderDetails.shippingFee.toLocaleString('en-IN')}` : 'Free'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 0; color: #1d1d1f; font-size: 18px; font-weight: 600;">Total</td>
                        <td style="padding: 16px 0 0; text-align: right; color: #1d1d1f; font-size: 18px; font-weight: 600;">₹${orderDetails.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Shipping Details -->
                <tr>
                  <td style="padding: 0 40px 40px; background-color: #ffffff;">
                    <div style="background-color: #f5f5f7; border-radius: 8px; padding: 24px;">
                      <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1d1d1f;">Shipping Information</h3>
                      <p style="margin: 0; font-size: 14px; color: #515154; line-height: 1.6;">
                        ${(() => {
                          try {
                            const addr = JSON.parse(orderDetails.shippingAddress);
                            return `${addr.addressLine1}<br>${addr.city}, ${addr.state} - ${addr.pincode}`;
                          } catch {
                            return orderDetails.shippingAddress;
                          }
                        })()}<br>
                        <strong>Payment Method:</strong> ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid (Razorpay)'}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Track Order Button -->
                <tr>
                  <td style="padding: 0 40px 40px; text-align: center;">
                    <a href="https://outflank.in/account" style="display: inline-block; padding: 14px 32px; background-color: #1d1d1f; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 30px; letter-spacing: 0.5px;">View Order Status</a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #1d1d1f; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #86868b;">Need help? Reply to this email and we'll be right with you.</p>
                    <p style="margin: 12px 0 0; font-size: 12px; color: #515154;">© ${new Date().getFullYear()} Outflank. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Confirmation email sent to ${orderDetails.customerEmail}`)
  } catch (error) {
    console.error('Error sending confirmation email:', error)
  }
}

// ─── Shipment Status Email ────────────────────────────────────────────────────

export async function sendShipmentStatusEmail(details: {
  customerEmail: string
  customerName: string
  orderId: string
  awbNumber?: string
  status: string // 'out_for_delivery' | 'delivered'
  riderName?: string | null
  riderContact?: string | null
  currentLocation?: string | null
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return

  const isDelivered = details.status === 'delivered'
  const subject = isDelivered
    ? `Your order has been delivered! ✅ — Outflank #${details.orderId.slice(0, 8)}`
    : `Your order is out for delivery! 🚚 — Outflank #${details.orderId.slice(0, 8)}`

  const headline = isDelivered ? 'Your order has been delivered!' : 'Your order is out for delivery!'
  const subtext = isDelivered
    ? `Hi ${details.customerName}, your order has been successfully delivered. Thank you for shopping with Outflank!`
    : `Hi ${details.customerName}, your order is on its way and will be delivered today!`

  const riderInfo = !isDelivered && details.riderName
    ? `<div style="background-color:#f0fdf4;border-radius:8px;padding:16px;margin-top:20px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#166534;">Delivery Executive</p>
        <p style="margin:0;font-size:14px;color:#15803d;">${details.riderName}${details.riderContact ? ` · ${details.riderContact}` : ''}</p>
      </div>`
    : ''

  const awbBadge = details.awbNumber
    ? `<p style="margin:16px 0 0;font-size:13px;color:#86868b;">AWB: <strong>${details.awbNumber}</strong>${details.currentLocation ? ` · ${details.currentLocation}` : ''}</p>`
    : ''

  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f5f5f7;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);max-width:600px;margin:0 auto;">
            <tr>
              <td style="padding:40px 40px 30px;text-align:center;border-bottom:1px solid #eaeaea;">
                <img src="https://outflank.in/logo/outflank-logo.png" alt="Outflank" style="height:48px;width:auto;display:block;margin:0 auto 24px;" />
                <div style="width:64px;height:64px;background-color:${isDelivered ? '#f0fdf4' : '#eff6ff'};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;">
                  ${isDelivered ? '✅' : '🚚'}
                </div>
                <h1 style="margin:0;font-size:24px;font-weight:600;color:#1d1d1f;">${headline}</h1>
                <p style="margin:12px 0 0;font-size:16px;color:#86868b;line-height:1.5;">${subtext}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;">
                <div style="background-color:#f5f5f7;border-radius:8px;padding:20px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#86868b;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1d1d1f;">#${details.orderId.split('-')[0].toUpperCase()}</p>
                  ${awbBadge}
                </div>
                ${riderInfo}
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 40px;text-align:center;">
                <a href="${details.awbNumber ? `https://shadowfax.in/tracking/${details.awbNumber}` : 'https://outflank.in/account'}" style="display:inline-block;padding:14px 32px;background-color:#1d1d1f;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:30px;">Track Live on Shadowfax</a>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 40px;background-color:#1d1d1f;text-align:center;">
                <p style="margin:0;font-size:14px;color:#86868b;">Need help? Reply to this email and we'll be right with you.</p>
                <p style="margin:12px 0 0;font-size:12px;color:#515154;">© ${new Date().getFullYear()} Outflank. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body></html>
  `

  try {
    await transporter.sendMail({
      from: `"Outflank" <${process.env.SMTP_USER}>`,
      to: details.customerEmail,
      subject,
      html,
    })
    console.log(`Shipment status email (${details.status}) sent to ${details.customerEmail}`)
  } catch (error) {
    console.error('Error sending shipment status email:', error)
  }
}

