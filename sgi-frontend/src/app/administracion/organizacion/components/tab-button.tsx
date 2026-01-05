export function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-gray-100 text-blue-600 shadow-inner' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}