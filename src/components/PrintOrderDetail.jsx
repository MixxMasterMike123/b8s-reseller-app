import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const PrintOrderDetail = ({ order }) => {
  if (!order) return null;

  return (
    <div className="print-only p-8">
      <h1 className="text-2xl font-bold text-center mb-8">{order.id}</h1>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Orderinformation</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Order ID:</span> {order.id}</p>
            <p><span className="font-medium">Datum:</span> {format(new Date(order.createdAt), 'PPP', { locale: sv })}</p>
            <p><span className="font-medium">Status:</span> {order.status}</p>
            <p><span className="font-medium">Totalt belopp:</span> {order.totalAmount} kr</p>
          </div>
        </div>

        {order.user && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Kundinformation</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Företag:</span> {order.user.companyName}</p>
              <p><span className="font-medium">Kontaktperson:</span> {order.user.contactPerson}</p>
              <p><span className="font-medium">Email:</span> {order.user.email}</p>
              <p><span className="font-medium">Telefon:</span> {order.user.phone}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Produkter</h2>
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Produkt</th>
              <th className="text-right py-2">Antal</th>
              <th className="text-right py-2">Pris</th>
              <th className="text-right py-2">Totalt</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="text-right py-2">{item.quantity}</td>
                <td className="text-right py-2">{item.price} kr</td>
                <td className="text-right py-2">{item.quantity * item.price} kr</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="text-right py-2 font-medium">Totalt:</td>
              <td className="text-right py-2 font-medium">{order.totalAmount} kr</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PrintOrderDetail; 