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
                        ${orderDetails.shippingAddress}<br>
                        <strong>Payment Method:</strong> ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid (Razorpay)'}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Track Order Button -->
                <tr>
                  <td style="padding: 0 40px 40px; text-align: center;">
                    <a href="https://outflank.in/account" style="display: inline-block; padding: 14px 32px; background-color: #1d1d1f; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 30px; letter-spacing: 0.5px;">Track Your Order</a>
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
