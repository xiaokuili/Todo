import { useMemo } from 'react';

// 解析时间字符串为分钟数（从 00:00 开始）
function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null;
}

// 格式化时间显示
function formatTime(timeStr) {
  if (!timeStr || timeStr === '--:--') return '--:--';
  return timeStr;
}

// 计算时间段的持续时间
function calculateDuration(start, end) {
  const startMin = parseTime(start);
  const endMin = parseTime(end);

  if (startMin === null || endMin === null) return null;

  const duration = endMin - startMin;
  if (duration <= 0) return null;

  const hours = Math.floor(duration / 60);
  const mins = duration % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

// 时间轴组件：显示单个任务的时间条
export function TimelineBar({ todo }) {
  const { start, end, name, status } = todo;

  const startMin = parseTime(start);
  const endMin = parseTime(end);
  const hasTime = startMin !== null && endMin !== null;

  // 计算时间条在 24 小时中的位置和宽度
  const position = useMemo(() => {
    if (!hasTime) return null;

    const startPercent = (startMin / (24 * 60)) * 100;
    const endPercent = (endMin / (24 * 60)) * 100;
    const widthPercent = endPercent - startPercent;

    return {
      left: `${startPercent}%`,
      width: `${Math.max(widthPercent, 0.5)}%`, // 最小宽度 0.5%
    };
  }, [hasTime, startMin, endMin]);

  const duration = calculateDuration(start, end);

  // 状态对应的颜色
  const statusColor = {
    pending: 'bg-slate-300 border-slate-400',
    in_progress: 'bg-blue-400 border-blue-500',
    completed: 'bg-green-400 border-green-500',
  };

  const textColor = {
    pending: 'text-slate-700',
    in_progress: 'text-blue-700',
    completed: 'text-green-700',
  };

  if (!hasTime) {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400 py-2">
        <div className="w-12 text-right font-mono">--:--</div>
        <div className="flex-1 flex items-center gap-2">
          <div className="h-1 w-16 bg-slate-100 rounded-full"></div>
          <span className="text-slate-300">未设置时间</span>
        </div>
      </div>
    );
  }

  return (
    <div className="group/timeline relative">
      {/* 时间标签 */}
      <div className="flex items-center gap-3 text-xs mb-1.5">
        <div className="w-12 text-right font-mono font-semibold text-slate-600">
          {formatTime(start)}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`font-medium truncate ${textColor[status] || 'text-slate-700'}`}>
            {name || '未命名任务'}
          </span>
          {duration && (
            <span className="text-slate-400 font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">
              {duration}
            </span>
          )}
        </div>
        <div className="w-12 text-left font-mono font-semibold text-slate-600">
          {formatTime(end)}
        </div>
      </div>

      {/* 时间轴刻度背景 */}
      <div className="relative h-8 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
        {/* 24 小时刻度线 */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-slate-100 last:border-r-0"
              title={`${i}:00`}
            />
          ))}
        </div>

        {/* 时间条 */}
        <div
          className={`absolute top-1 bottom-1 ${statusColor[status] || 'bg-slate-300 border-slate-400'} border rounded transition-all group-hover/timeline:shadow-md`}
          style={position}
          title={`${start} - ${end} (${duration})`}
        >
          {/* 内部渐变效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded"></div>
        </div>
      </div>

      {/* 底部小时标记（每 3 小时显示一次） */}
      <div className="flex mt-1 px-1 text-[9px] text-slate-400 font-mono">
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
          <div
            key={hour}
            className="flex-1 text-left"
            style={{ marginLeft: hour === 0 ? '0' : '-1ch' }}
          >
            {hour}
          </div>
        ))}
      </div>
    </div>
  );
}

// 整体时间轴视图：显示一天中所有任务的时间分布
export function TimelineView({ todos }) {
  // 只显示有时间的任务，并按开始时间排序
  const sortedTodos = useMemo(() => {
    return todos
      .filter(todo => todo.start && todo.end)
      .sort((a, b) => {
        const aStart = parseTime(a.start);
        const bStart = parseTime(b.start);
        if (aStart === null) return 1;
        if (bStart === null) return -1;
        return aStart - bStart;
      });
  }, [todos]);

  if (sortedTodos.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-100">
        <div className="text-slate-400 text-sm">
          暂无设置时间的任务
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedTodos.map(todo => (
        <TimelineBar key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
