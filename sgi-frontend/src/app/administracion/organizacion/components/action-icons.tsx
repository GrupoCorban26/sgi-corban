import { Edit, Clock, Trash2 } from 'lucide-react';

export function ActionIcons({ onHistory }: any) {
  return (
    <div className="flex items-center gap-1">
      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
        <Edit size={16} />
      </button>
      <button 
        onClick={onHistory}
        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-all"
        title="Ver historial"
      >
        <Clock size={16} />
      </button>
      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
        <Trash2 size={16} />
      </button>
    </div>
  );
}