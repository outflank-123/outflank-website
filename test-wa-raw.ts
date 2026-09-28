import { sendWhatsAppMessage } from './lib/services/whatsapp';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Sending...");
  const res = await sendWhatsAppMessage({
    to: "+918447334407",
    messageText: "Test",
    templateName: "order_placed",
    templateParams: ["Test User", "#TEST1234", "Polo T-Shirt", "₹1,000", "COD"],
    linkUrl: "track?order_id=123",
  });
  console.log("Result:", res);
}
run();
