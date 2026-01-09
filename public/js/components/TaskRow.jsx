import { useState, useMemo } from 'react';
import { Play, Check, Circle, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { StepItem } from './StepItem';
import { api } from '../api';

const statusIcon = {
  pending: Circle,
  completed: Check,
};

export function TaskRow({ todo, onUpdate, onDelete }) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开

  const [timeStart, setTimeStart] = useState(todo.start || '');
  const [timeEnd, setTimeEnd] = useState(todo.end || '');
  const [nameText, setNameText] = useState(todo.name || '');
  const [newStepContent, setNewStepContent] = useState('');

  const StatusIcon = statusIcon[todo.status] || Circle;
  const isCompleted = todo.status === 'completed';

  // 检查是否有运行中的子任务
  const hasRunningStep = todo.actionItems?.some(a => a.status === 'running');
  const isCurrentTask = hasRunningStep;

  const handleCycleStatus = async () => {
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed';
    await api.updateTodo(todo.id, { status: nextStatus });
    onUpdate?.();
  };

  const handleUpdateField = async (field, value) => {
    await api.updateTodo(todo.id, { [field]: value || null });
    onUpdate?.();
  };

  const handleSaveTime = async () => {
    await api.updateTodo(todo.id, {
      start: timeStart || null,
      end: timeEnd || null
    });
    setIsEditingTime(false);
    onUpdate?.();
  };

  const handleSaveName = async () => {
    if (nameText.trim()) {
      await api.updateTodo(todo.id, { name: nameText.trim() });
    }
    setIsEditingName(false);
    onUpdate?.();
  };

  // 子任务操作
  const handleAddStep = async () => {
    if (!newStepContent.trim()) return;

    try {
      await api.addAction(todo.id, newStepContent.trim());
      setNewStepContent('');
      setIsAddingStep(false);
      onUpdate?.();
    } catch (error) {
      alert('添加步骤失败: ' + error.message);
    }
  };

  const handleStartAction = async (actionId) => {
    try {
      await api.startAction(todo.id, actionId);
      onUpdate?.();
    } catch (error) {
      alert('启动步骤失败: ' + error.message);
    }
  };

  const handleStopAction = async (actionId, note) => {
    try {
      await api.stopAction(todo.id, actionId, note);
      onUpdate?.();
    } catch (error) {
      alert('停止步骤失败: ' + error.message);
    }
  };

  const handleUpdateAction = async (actionId, updates) => {
    try {
      await api.updateAction(todo.id, actionId, updates);
      onUpdate?.();
    } catch (error) {
      alert('更新步骤失败: ' + error.message);
    }
  };

  const handleDeleteAction = async (actionId) => {
    try {
      await api.deleteAction(todo.id, actionId);
      onUpdate?.();
    } catch (error) {
      alert('删除步骤失败: ' + error.message);
    }
  };

  // 时间显示 - 只在有时间时显示
  const hasTime = todo.start && todo.end;
  const timeDisplay = hasTime ? `${todo.start}-${todo.end}` : '';

  const activeSteps = todo.actionItems?.filter(a => a.status !== 'deleted') || [];
  const hasSteps = activeSteps.length > 0;

  return (
    <div className={`mb-3 border border-slate-200 rounded-lg overflow-hidden ${isCurrentTask ? 'bg-yellow-50' : 'bg-white'}`}>
      {/* 主任务行 */}
      <div className="flex items-center gap-3 py-3 px-3 group/task">
        {/* 时间 - 只在有时间或正在编辑时显示 */}
        {isEditingTime ? (
          <div className="flex items-center gap-1 font-mono text-sm flex-shrink-0">
            <input
              type="text"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              placeholder="09:00"
              className="w-14 px-1 text-center border-b border-slate-300 focus:outline-none focus:border-slate-900"
              autoFocus
            />
            <span>-</span>
            <input
              type="text"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              placeholder="10:00"
              className="w-14 px-1 text-center border-b border-slate-300 focus:outline-none focus:border-slate-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTime();
                if (e.key === 'Escape') setIsEditingTime(false);
              }}
              onBlur={handleSaveTime}
            />
          </div>
        ) : hasTime ? (
          <button
            onClick={() => setIsEditingTime(true)}
            className="font-mono text-sm text-slate-600 hover:text-slate-900 flex-shrink-0"
          >
            {timeDisplay}
          </button>
        ) : null}

        {/* 状态图标 */}
        <button
          onClick={handleCycleStatus}
          className="flex-shrink-0 text-slate-400 hover:text-slate-900 transition-colors"
        >
          {isCompleted ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        {/* 任务名称 */}
        {isEditingName ? (
          <input
            type="text"
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveName();
                // 保存后直接进入添加步骤模式
                setTimeout(() => setIsAddingStep(true), 100);
              }
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            onBlur={handleSaveName}
            className="flex-1 text-sm font-medium px-2 py-0.5 border-b border-slate-300 focus:outline-none focus:border-slate-900"
            autoFocus
          />
        ) : (
          <span
            onClick={() => !isCompleted && setIsEditingName(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCompleted) {
                e.preventDefault();
                setIsAddingStep(true);
              }
            }}
            tabIndex={0}
            className={`flex-1 text-sm font-medium ${
              isCompleted
                ? 'line-through text-slate-400'
                : 'text-slate-900 cursor-pointer hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300'
            }`}
          >
            {todo.name || '未命名任务'}
          </span>
        )}

        {/* 项目标签 */}
        {todo.project && (
          <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
            #{todo.project}
          </span>
        )}

        {/* 折叠按钮和快捷键提示 */}
        <div className="flex items-center gap-2">
          {hasSteps && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-900 transition-colors"
              title={isExpanded ? '折叠子任务' : '展开子任务'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <div className="text-xs text-slate-400 opacity-0 group-hover/task:opacity-100 transition-opacity">
            <span>回车:步骤</span>
          </div>
        </div>
      </div>

      {/* 子任务区域 */}
      {isExpanded && (hasSteps || isAddingStep) && (
        <div className="pt-3 border-t border-slate-100">
          {/* 子任务列表 */}
          {activeSteps.map(action => (
            <StepItem
              key={action.id}
              action={action}
              onStart={handleStartAction}
              onStop={handleStopAction}
              onUpdate={handleUpdateAction}
              onDelete={handleDeleteAction}
            />
          ))}

          {/* 添加步骤输入框 */}
          {isAddingStep ? (
            <div className="mx-3 mb-2 p-3 bg-white border border-slate-300 rounded-lg">
              <input
                type="text"
                value={newStepContent}
                onChange={(e) => setNewStepContent(e.target.value)}
                placeholder="新步骤（建议 40 分钟内完成）..."
                className="w-full text-sm px-2 py-1 border-b border-slate-300 focus:outline-none focus:border-slate-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddStep();
                  if (e.key === 'Escape') {
                    setIsAddingStep(false);
                    setNewStepContent('');
                  }
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddStep}
                  className="text-xs px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-700"
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setIsAddingStep(false);
                    setNewStepContent('');
                  }}
                  className="text-xs px-3 py-1 text-slate-600 hover:text-slate-900"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingStep(true)}
              className="mx-3 mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>添加子任务</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
