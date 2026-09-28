import { sendOrderPlacedNotification, getWhatsAppSettings } from './lib/services/whatsapp';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const settings = await getWhatsAppSettings();
  console.log("Notifications enabled in settings:", settings.whatsapp_notifications_enabled);

  const order = {
    id: "TEST1234",
    customer_name: "Test User",
    customer_email: "test@example.com",
    customer_phone: "+918447334407",
    total_amount: 1000,
    shipping_fee: 0,
    payment_method: 'cod',
    items: [{ product_name: "Polo T-Shirt" }]
  };
  
  console.log("Triggering order_placed...");
  await sendOrderPlacedNotification({ order });
  console.log("Trigger done.");
}
run();
