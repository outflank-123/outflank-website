import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import PrintInvoiceButton from './PrintInvoiceButton';

export default async function InvoicePage({ params }: any) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('retail_orders')
    .select(`
      *,
      retail_order_items (*)
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    return notFound();
  }

  let shippingAddress;
  try {
    shippingAddress = JSON.parse(order.shipping_address);
  } catch {
    shippingAddress = { addressLine1: order.shipping_address, city: '', state: '', pincode: '' };
  }

  const subtotal = order.total_amount - (order.shipping_fee || 0);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white shadow-xl flex flex-col relative print:shadow-none print:m-0 print:p-0">
        
        {/* Controls - Hidden when printing */}
        <div className="bg-gray-100 p-4 flex justify-between items-center print:hidden border-b border-gray-200">
          <p className="text-sm text-gray-500">Print or save this invoice as a PDF</p>
          <PrintInvoiceButton />
        </div>

        {/* Invoice Content */}
        <div id="invoice-content" className="p-6 sm:p-8 bg-white text-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
            <div>
              <img src="/logo/outflank-logo.png" alt="Outflank" className="h-8 w-auto mb-2" />
              <p className="text-gray-500 text-xs">
                Email: info@outflank.in
              </p>
            </div>
            <div className="text-left sm:text-right mt-4 sm:mt-0 max-w-[50%]">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">INVOICE</h1>
              <p className="text-gray-600 text-xs">
                <span className="font-semibold text-gray-800">Invoice #</span> <span className="break-all">{order.id}</span><br />
                <span className="font-semibold text-gray-800">Date:</span> {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
                <span className="font-semibold text-gray-800">Payment:</span> {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
              </p>
            </div>
          </div>

          <hr className="border-gray-200 mb-6" />

          {/* Bill To */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">Bill To:</h2>
            <p className="text-gray-700 text-xs">
              <span className="font-semibold text-gray-900">{order.customer_name}</span><br />
              {shippingAddress.addressLine1}<br />
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}<br />
              {order.customer_email}<br />
              {order.customer_phone}
            </p>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-2 text-xs font-bold text-gray-800 uppercase">Item Description</th>
                <th className="py-2 text-xs font-bold text-gray-800 uppercase text-center w-16">Qty</th>
                <th className="py-2 text-xs font-bold text-gray-800 uppercase text-right w-24">Price</th>
                <th className="py-2 text-xs font-bold text-gray-800 uppercase text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.retail_order_items.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-2">
                    <p className="font-semibold text-gray-900 text-xs">{item.product_name}</p>
                    {item.selected_color && <p className="text-gray-500 text-[10px]">Color: {item.selected_color}</p>}
                  </td>
                  <td className="py-2 text-center text-gray-700 text-xs">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-700 text-xs">₹{item.price_at_time.toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right text-gray-900 font-semibold text-xs">₹{(item.price_at_time * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-1/2 md:w-1/3">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600 text-xs">Subtotal</span>
                <span className="text-gray-800 font-semibold text-xs">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600 text-xs">Shipping</span>
                <span className="text-gray-800 font-semibold text-xs">
                  {order.shipping_fee > 0 ? `₹${order.shipping_fee.toLocaleString('en-IN')}` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-900 font-bold text-sm">Total</span>
                <span className="text-gray-900 font-bold text-sm">₹{order.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-gray-500 text-xs">
            <p className="font-semibold text-gray-700 mb-1">Thank you for your business!</p>
            <p className="mb-2">If you have any questions concerning this invoice, please contact info@outflank.in</p>
            <p className="text-[10px] text-gray-400">
              Track this order anytime at <strong>outflank.in/track</strong> using your Order ID and Email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
