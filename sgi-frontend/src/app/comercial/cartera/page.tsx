export default function Page() {
  return (
    <main className="space-y-8">
      <h1 className="text-azul-500 font-extrabold uppercase text-3xl">Base de Datos de Prospectos</h1>
      <div className="flex gap-8 items-center">
        <input className="border rounded-xl p-2" type="text" placeholder="Buscar por RUC" />
        <input className="border rounded-xl p-2" type="text" placeholder="Buscar por Razón Social" />
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th>RUC</th>
            <th>RAZÓN SOCIAL</th>
            <th>TELÉFONO</th>
            <th>CORREO</th>
            <th>ESTADO</th>
            <th>COMENTARIO</th>
          </tr>
        </thead>
      </table>
    </main>
  );
}