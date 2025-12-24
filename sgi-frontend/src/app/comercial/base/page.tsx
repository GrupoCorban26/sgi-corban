export default function Page() {
  return (
    <main className="space-y-8">
      <h1 className="text-azul-500 font-extrabold uppercase text-3xl">Base de Datos de Prospectos</h1>
      <div className="flex gap-8 items-center">
        <button className="border-2 p-2 rounded-xl border-naranja-500">Cargar Nueva base</button>
        <button className="border-2 p-2 rounded-xl border-naranja-500">Enviar feedback</button>
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