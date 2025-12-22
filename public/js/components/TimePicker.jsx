import { useState, useEffect } from 'react';
import { Play, Square, ArrowRight, Trash2 } from 'lucide-react';

// ============================================================================
// 时间选择器组件 - 瑞士极简风格
// ============================================================================
// 如需调整时间 UI，主要修改以下部分：
// - 查看模式的 JSX（isEditMode === false）
// - 编辑模式的 JSX（isEditMode === true）
// ============================================================================

export function TimePicker({ todo, onTimeChange, isEditing, onStartEdit, onCancelEdit }) {
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('18');
  const [endMin, setEndMin] = useState('00');

  useEffect(() => {
    if (todo?.start) {
      const [h, m] = todo.start.split(':');
      setStartHour(h || '09');
      setStartMin(m || '00');
    }
    if (todo?.end) {
      const [h, m] = todo.end.split(':');
      setEndHour(h || '18');
      setEndMin(m || '00');
    }
    setIsEditMode(isEditing);
  }, [todo, isEditing]);

  const start = todo?.start || '--:--';
  const end = todo?.end || '--:--';
  const hasTime = !!(todo?.start || todo?.end);
  const startH = start !== '--:--' ? start.split(':')[0] : '--';
  const startM = start !== '--:--' ? start.split(':')[1] : '--';
  const endH = end !== '--:--' ? end.split(':')[0] : '--';
  const endM = end !== '--:--' ? end.split(':')[1] : '--';

  const handleInputChange = (setter, max) => (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    if (val) {
      const num = parseInt(val) || 0;
      if (num > max) val = String(max);
    }
    setter(val);
  };

  const handleBlur = (setter, max) => (e) => {
    let val = parseInt(e.target.value) || 0;
    if (val < 0) val = 0;
    if (val > max) val = max;
    setter(String(val).padStart(2, '0'));
  };

  const handleSave = () => {
    const start = `${startHour.padStart(2, '0')}:${startMin.padStart(2, '0')}`;
    const end = `${endHour.padStart(2, '0')}:${endMin.padStart(2, '0')}`;
    onTimeChange?.(todo.id, start, end);
    setIsEditMode(false);
    onCancelEdit?.();
  };

  const handleClear = () => {
    if (confirm('确定要清除时间吗？')) {
      onTimeChange?.(todo.id, null, null);
    }
  };

  if (isEditMode) {
    return (
      <div className="swiss-time-picker swiss-minimal-bar flex items-center gap-1 rounded-full px-2 py-1.5">
        {/* 开始时间输入组 */}
        <div className="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full">
          <div className="flex items-center justify-center w-5 h-5">
            <Play className="w-3 h-3 text-zinc-400 fill-zinc-400" />
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={startHour}
              onChange={handleInputChange(setStartHour, 23)}
              onBlur={handleBlur(setStartHour, 23)}
              className="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxLength="2"
            />
            <span className="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <input
              type="text"
              value={startMin}
              onChange={handleInputChange(setStartMin, 59)}
              onBlur={handleBlur(setStartMin, 59)}
              className="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxLength="2"
            />
          </div>
        </div>

        {/* 中间连接符 */}
        <div className="px-1 text-zinc-200">
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
        </div>

        {/* 结束时间输入组 */}
        <div className="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full">
          <div className="flex items-center justify-center w-5 h-5">
            <Square className="w-3 h-3 text-zinc-400 fill-zinc-400" />
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={endHour}
              onChange={handleInputChange(setEndHour, 23)}
              onBlur={handleBlur(setEndHour, 23)}
              className="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxLength="2"
            />
            <span className="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <input
              type="text"
              value={endMin}
              onChange={handleInputChange(setEndMin, 59)}
              onBlur={handleBlur(setEndMin, 59)}
              className="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxLength="2"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={() => {
              setIsEditMode(false);
              onCancelEdit?.();
            }}
            className="px-2 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 uppercase transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 text-[10px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded uppercase transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="swiss-time-picker swiss-minimal-bar flex items-center gap-1 rounded-full px-2 py-1.5 group relative">
      {/* 开始时间组 */}
      <div
        className="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer"
        onClick={() => {
          setIsEditMode(true);
          onStartEdit?.();
        }}
      >
        <div className="flex items-center justify-center w-5 h-5">
          <Play className="w-3 h-3 text-zinc-400 fill-zinc-400" />
        </div>
        <div className="flex items-center">
          <span className="swiss-mono w-6 text-center text-base font-bold text-zinc-900">
            {startH}
          </span>
          <span className="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
          <span className="swiss-mono w-6 text-center text-base font-bold text-zinc-900">
            {startM}
          </span>
        </div>
      </div>

      {/* 中间连接符 */}
      <div className="px-1 text-zinc-200">
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
      </div>

      {/* 结束时间组 */}
      <div
        className="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer"
        onClick={() => {
          setIsEditMode(true);
          onStartEdit?.();
        }}
      >
        <div className="flex items-center justify-center w-5 h-5">
          <Square className="w-3 h-3 text-zinc-400 fill-zinc-400" />
        </div>
        <div className="flex items-center">
          <span className="swiss-mono w-6 text-center text-base font-bold text-zinc-900">
            {endH}
          </span>
          <span className="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
          <span className="swiss-mono w-6 text-center text-base font-bold text-zinc-900">
            {endM}
          </span>
        </div>
      </div>

      {hasTime && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          className="ml-2 text-zinc-400 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

