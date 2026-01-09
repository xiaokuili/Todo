import { useState, useEffect } from 'react';
import { Play, Square, MessageSquare, Trash2, Clock, AlertTriangle } from 'lucide-react';

// 格式化时长
function formatDuration(ms) {
  if (!ms) return '0分钟';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  }
  return `${mins}分钟`;
}

// 计算子任务当前时长
function calculateDuration(action) {
  if (action.status === 'completed' && action.duration) {
    return action.duration;
  }
  if (action.status === 'running' && action.startTime) {
    return Date.now() - new Date(action.startTime).getTime();
  }
  return 0;
}

export function ActionItem({ action, onStart, onStop, onUpdate, onDelete }) {
  const [duration, setDuration] = useState(() => calculateDuration(action));
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(action.note || '');

  const MAX_DURATION = 40 * 60 * 1000; // 40分钟
  const WARN_THRESHOLD = 35 * 60 * 1000; // 35分钟警告

  // 实时更新运行中的任务时长
  useEffect(() => {
    if (action.status !== 'running') return;

    const timer = setInterval(() => {
      setDuration(calculateDuration(action));
    }, 1000); // 每秒更新

    return () => clearInterval(timer);
  }, [action]);

  const handleStart = () => {
    onStart(action.id);
  };

  const handleStop = () => {
    const note = showNoteInput ? noteText : null;
    onStop(action.id, note);
    setShowNoteInput(false);
  };

  const handleSaveNote = () => {
    onUpdate(action.id, { note: noteText });
    setShowNoteInput(false);
  };

  const isOvertime = duration >= MAX_DURATION;
  const isNearLimit = duration >= WARN_THRESHOLD && duration < MAX_DURATION;

  return (
    <div className="group/action flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      {/* 状态图标和操作按钮 */}
      <div className="flex-shrink-0">
        {action.status === 'completed' ? (
          <div className="w-6 h-6 flex items-center justify-center text-green-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : action.status === 'running' ? (
          <button
            onClick={handleStop}
            className="w-6 h-6 flex items-center justify-center text-yellow-500 hover:text-yellow-600 transition-colors"
            title="停止"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="w-6 h-6 flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors"
            title="开始"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-w-0">
        {/* 任务名称 */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-sm font-medium ${
              action.status === 'completed'
                ? 'line-through text-slate-400'
                : 'text-slate-700'
            }`}
          >
            {action.content}
          </span>

          {/* 时间显示 */}
          {action.status === 'running' && (
            <span className="flex items-center gap-1 text-xs text-yellow-600">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </span>
          )}

          {action.status === 'completed' && action.duration && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Clock className="w-3 h-3" />
              {formatDuration(action.duration)}
            </span>
          )}
        </div>

        {/* 警告提示 */}
        {action.status === 'running' && (isOvertime || isNearLimit) && (
          <div
            className={`flex items-center gap-1 text-xs ${
              isOvertime ? 'text-red-600' : 'text-yellow-600'
            } mb-2`}
          >
            <AlertTriangle className="w-3 h-3" />
            {isOvertime ? (
              <span>已超过 40 分钟上限！请立即结束或重新拆分</span>
            ) : (
              <span>即将达到 40 分钟上限 (剩余 {Math.floor((MAX_DURATION - duration) / 60000)}分钟)</span>
            )}
          </div>
        )}

        {/* 备注显示 */}
        {action.note && !showNoteInput && (
          <div className="flex items-start gap-1 text-xs text-slate-500 mt-1">
            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{action.note}</span>
          </div>
        )}

        {/* 备注输入 */}
        {showNoteInput && (
          <div className="mt-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="添加备注..."
              className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNote();
                } else if (e.key === 'Escape') {
                  setShowNoteInput(false);
                  setNoteText(action.note || '');
                }
              }}
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleSaveNote}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteText(action.note || '');
                }}
                className="text-xs px-2 py-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover/action:opacity-100 transition-opacity">
        {!showNoteInput && action.status !== 'deleted' && (
          <button
            onClick={() => setShowNoteInput(true)}
            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
            title="添加备注"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        )}

        {action.status !== 'deleted' && (
          <button
            onClick={() => onDelete(action.id)}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 停止时询问备注 */}
      {action.status === 'running' && !showNoteInput && (
        <button
          onClick={() => setShowNoteInput(true)}
          className="text-xs text-slate-400 hover:text-blue-500 underline"
          title="点击在停止时添加备注"
        >
          添加备注
        </button>
      )}
    </div>
  );
}
