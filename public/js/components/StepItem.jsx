import { useState, useEffect } from 'react';
import { Play, Square, Check, Clock } from 'lucide-react';

// 格式化时长为 HH:MM:SS
function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// 格式化时间戳为日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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

export function StepItem({ action, onStart, onStop, onUpdate, onDelete }) {
  const [duration, setDuration] = useState(() => calculateDuration(action));
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(action.note || '');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentText, setContentText] = useState(action.content || '');

  const MAX_DURATION = 40 * 60 * 1000; // 40分钟

  // 实时更新运行中的任务时长
  useEffect(() => {
    if (action.status !== 'running') return;

    const timer = setInterval(() => {
      setDuration(calculateDuration(action));
    }, 1000);

    return () => clearInterval(timer);
  }, [action]);

  const handleStart = () => {
    onStart(action.id);
  };

  const handleStop = () => {
    if (noteText.trim()) {
      onStop(action.id, noteText.trim());
    } else {
      onStop(action.id, null);
    }
    setIsEditingNote(false);
  };

  const handleSaveNote = () => {
    onUpdate(action.id, { note: noteText.trim() || null });
    setIsEditingNote(false);
  };

  const handleSaveContent = () => {
    if (contentText.trim()) {
      onUpdate(action.id, { content: contentText.trim() });
    }
    setIsEditingContent(false);
  };

  const isOvertime = duration >= MAX_DURATION;

  const handleKeyDown = (e) => {
    if (action.status === 'completed') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(action.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingContent(true);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (action.status === 'running') {
        handleStop();
      } else {
        handleStart();
      }
    }
  };

  if (isEditingContent) {
    return (
      <div className="mx-3 mb-2 p-3 bg-white border border-slate-900 rounded-lg">
        <input
          type="text"
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveContent();
            if (e.key === 'Escape') setIsEditingContent(false);
          }}
          onBlur={handleSaveContent}
          className="w-full text-sm px-2 py-0.5 border-b border-slate-300 focus:outline-none focus:border-slate-900"
          autoFocus
        />
      </div>
    );
  }

  // 状态颜色
  const statusColors = {
    pending: 'border-slate-200 bg-white hover:border-slate-300',
    running: 'border-yellow-400 bg-yellow-50',
    completed: 'border-green-200 bg-green-50',
  };

  const statusIconColors = {
    pending: 'text-slate-400',
    running: 'text-yellow-600',
    completed: 'text-green-600',
  };

  return (
    <div
      className={`group/step mx-3 mb-2 p-3 border rounded-lg transition-all ${statusColors[action.status]}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <button
          onClick={action.status === 'running' ? handleStop : handleStart}
          className={`flex-shrink-0 ${statusIconColors[action.status]} hover:opacity-70 transition-opacity mt-0.5`}
          disabled={action.status === 'completed'}
          tabIndex={-1}
        >
          {action.status === 'completed' ? (
            <Check className="w-5 h-5" />
          ) : action.status === 'running' ? (
            <Square className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          {/* 任务标题 */}
          <div
            onClick={() => action.status !== 'completed' && setIsEditingContent(true)}
            className={`text-sm font-medium mb-1 ${
              action.status === 'completed'
                ? 'line-through text-slate-400'
                : 'text-slate-900 cursor-pointer'
            }`}
          >
            {action.content}
          </div>

          {/* 备注 */}
          {action.note && !isEditingNote && (
            <div
              onClick={() => action.status !== 'completed' && setIsEditingNote(true)}
              className="text-xs text-slate-500 mb-2 cursor-pointer hover:text-slate-700"
            >
              {action.note}
            </div>
          )}

          {/* 备注编辑 */}
          {isEditingNote && (
            <div className="mb-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="添加备注..."
                className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNote();
                  if (e.key === 'Escape') {
                    setIsEditingNote(false);
                    setNoteText(action.note || '');
                  }
                }}
                onBlur={handleSaveNote}
              />
            </div>
          )}

          {/* 底部信息栏 */}
          <div className="flex items-center gap-3 text-xs">
            {/* 时间信息 */}
            {action.status === 'running' && (
              <div className="flex items-center gap-1 text-yellow-700 font-medium">
                <Clock className="w-3 h-3" />
                <span className="font-mono">{formatDuration(duration)}</span>
                {isOvertime && <span className="text-red-600 ml-1">⚠ 超时</span>}
              </div>
            )}

            {action.status === 'completed' && action.endTime && (
              <div className="flex items-center gap-2 text-slate-500">
                <span>{formatDateTime(action.endTime)}</span>
                {action.duration && (
                  <span className="font-mono text-green-600">
                    {formatDuration(action.duration)}
                  </span>
                )}
              </div>
            )}

            {action.status === 'pending' && (
              <span className="text-slate-400">待开始</span>
            )}

            {/* 快捷键提示 */}
            {action.status !== 'completed' && (
              <div className="ml-auto text-slate-300 opacity-0 group-hover/step:opacity-100 transition-opacity">
                <span>空格:开始 Enter:编辑 Del:删除</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
