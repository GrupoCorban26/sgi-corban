export default function Page() {
  return (
    <main className="space-y-8">
      <h1 className="text-azul-500 font-extrabold uppercase text-3xl">Órdenes</h1>
      <div className="flex gap-8 items-center">
        <input className="border rounded-xl p-2" type="text" placeholder="Buscar por RUC" />
        <input className="border rounded-xl p-2" type="text" placeholder="Buscar por Razón Social" />
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th>RUC</th>
            <th>RAZÓN SOCIAL</th>
            <th>COR</th>
            <th>DETALLE</th>
            <th>ACCIÓN</th>
          </tr>
        </thead>
      </table>
    </main>
  );
}