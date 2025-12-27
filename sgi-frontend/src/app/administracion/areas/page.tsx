

export default function Page() {
  return (
    <main className="space-y-8">
      <h1 className="text-azul-500 font-extrabold uppercase text-3xl">Áreas</h1>
      <div className="flex gap-8 items-center">
        <button className="border-2 p-2 rounded-xl border-naranja-500">Agregar area</button>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th>CÓDIGO</th>
            <th>NOMBRES</th>
            <th>APELLIDOS</th>
            <th>FECHA DE INICIO</th>
            <th>ESTADO</th>
          </tr>
        </thead>
      </table>
    </main>
  );
}