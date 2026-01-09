import { useState, useMemo } from 'react';
import { Circle, CheckCircle2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { TimePicker } from './TimePicker';
import { ActionItem } from './ActionItem';
import { api } from '../api';

const statusIcon = {
  pending: Circle,
  completed: CheckCircle2,
};

const statusColor = {
  pending: 'text-slate-400',
  completed: 'text-green-500',
};

// 计算子任务数量
function calculateStats(todo) {
  const actionItems = todo.actionItems || [];
  const activeActions = actionItems.filter(a => a.status !== 'deleted');

  return {
    totalCount: activeActions.length,
  };
}

export function TodoCard({ todo, onUpdate, onDelete }) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const StatusIcon = statusIcon[todo.status] || Circle;
  const isCompleted = todo.status === 'completed';

  const stats = useMemo(() => calculateStats(todo), [todo]);
  const hasActions = todo.actionItems && todo.actionItems.some(a => a.status !== 'deleted');

  const handleCycleStatus = async () => {
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed';
    await api.updateTodo(todo.id, { status: nextStatus });
    onUpdate?.();
  };

  const handleUpdateField = async (field, value) => {
    await api.updateTodo(todo.id, { [field]: value || null });
    onUpdate?.();
  };

  const handleTimeChange = async (id, start, end) => {
    await api.updateTodo(id, { start, end });
    onUpdate?.();
  };

  // 子任务操作
  const handleAddAction = async () => {
    const content = prompt('请输入子任务内容（建议控制在 40 分钟内）:');
    if (!content?.trim()) return;

    try {
      await api.addAction(todo.id, content.trim());
      onUpdate?.();
    } catch (error) {
      alert('添加子任务失败: ' + error.message);
    }
  };

  const handleStartAction = async (actionId) => {
    try {
      await api.startAction(todo.id, actionId);
      onUpdate?.();
    } catch (error) {
      alert('启动子任务失败: ' + error.message);
    }
  };

  const handleStopAction = async (actionId, note) => {
    try {
      await api.stopAction(todo.id, actionId, note);
      onUpdate?.();
    } catch (error) {
      alert('停止子任务失败: ' + error.message);
    }
  };

  const handleUpdateAction = async (actionId, updates) => {
    try {
      await api.updateAction(todo.id, actionId, updates);
      onUpdate?.();
    } catch (error) {
      alert('更新子任务失败: ' + error.message);
    }
  };

  const handleDeleteAction = async (actionId) => {
    if (!confirm('确定要删除这个子任务吗？')) return;

    try {
      await api.deleteAction(todo.id, actionId);
      onUpdate?.();
    } catch (error) {
      alert('删除子任务失败: ' + error.message);
    }
  };

  return (
    <div className="flex gap-4 items-start">
      {/* 左侧：时间卡片 */}
      <div className="flex-shrink-0">
        <TimePicker
          todo={todo}
          onTimeChange={handleTimeChange}
          isEditing={isEditingTime}
          onStartEdit={() => setIsEditingTime(true)}
          onCancelEdit={() => setIsEditingTime(false)}
        />
      </div>

      {/* 右侧：Todo卡片 */}
      <div className="flex-1 group border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* 状态图标 */}
          <button
            onClick={handleCycleStatus}
            className={`${statusColor[todo.status] || 'text-slate-400'} flex-shrink-0 hover:opacity-70 transition-opacity mt-1`}
            title="点击切换状态"
          >
            <StatusIcon className="w-5 h-5" />
          </button>

          {/* 内容区 */}
          <div className="flex-1 min-w-0">
            {/* 任务名称 */}
            <div className="flex items-start gap-2 mb-2">
              <input
                type="text"
                value={todo.name || ''}
                onChange={(e) => handleUpdateField('name', e.target.value)}
                className={`flex-1 ${
                  isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                } font-medium text-lg bg-transparent border-none outline-none focus:bg-slate-50 rounded px-2 py-1 -mx-2 -my-1`}
                placeholder="任务名称（交付物）"
              />
            </div>

            {/* 项目标签 */}
            {todo.project && (
              <div className="mb-3 px-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  #{todo.project}
                </span>
              </div>
            )}

            {/* 子任务列表 */}
            {hasActions && (
              <div className="mt-4">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800 mb-2"
                >
                  {showActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  子任务 ({stats.totalCount})
                </button>

                {showActions && (
                  <div className="space-y-2">
                    {todo.actionItems
                      .filter(action => action.status !== 'deleted')
                      .map(action => (
                        <ActionItem
                          key={action.id}
                          action={action}
                          onStart={handleStartAction}
                          onStop={handleStopAction}
                          onUpdate={handleUpdateAction}
                          onDelete={handleDeleteAction}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 添加子任务按钮 */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={handleAddAction}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded transition-colors"
                title="添加子任务（40分钟内）"
              >
                <Plus className="w-3 h-3" />
                添加子任务
              </button>
            </div>
          </div>

          {/* 删除按钮 */}
          <button
            onClick={() => {
              if (confirm('确定要删除这个待办事项吗？')) {
                onDelete?.(todo.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0 mt-1"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
