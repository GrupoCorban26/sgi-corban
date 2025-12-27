export default function Page() {
  return (
    <main className="space-y-8">
      <h1 className="text-azul-500 font-extrabold uppercase text-3xl">Cotizaciones</h1>
      <div className="flex justify-around">
        <div className="flex gap-8 items-center">
          <input className="border rounded-xl p-2" type="text" placeholder="Buscar por Código" />
          <input className="border rounded-xl p-2" type="text" placeholder="Buscar por RUC" />
          <input className="border rounded-xl p-2" type="text" placeholder="Buscar por Razón Social" />
        </div>
        <div className="">
          <button className="cursor-pointer bg-azul-500 p-2 rounded-xl text-white">Solicita una cotización</button>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th>CÓDIGO</th>
            <th>RUC</th>
            <th>RAZÓN SOCIAL</th>
            <th>ESTADO</th>
          </tr>
        </thead>
      </table>
    </main>
  );
}