interface TimelineItemProps {
  date: string;
  user: string;
  action: string;
  details: string;
}

export function TimelineItem({ date, user, action, details }: TimelineItemProps) {
  return (
    <div className="relative pl-8">
      {/* El círculo de la línea de tiempo */}
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-white border-2 border-orange-500 z-10 shadow-sm" />
      
      <div className="text-xs text-gray-400 font-medium mb-1">{date}</div>
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm shadow-sm hover:shadow-md transition-shadow">
        <div className="font-bold text-gray-700">{action}</div>
        <div className="text-gray-500 mb-1">
          Por: <span className="font-medium text-gray-600">{user}</span>
        </div>
        <div className="text-xs text-gray-500 italic leading-relaxed">
          {details}
        </div>
      </div>
    </div>
  );
}