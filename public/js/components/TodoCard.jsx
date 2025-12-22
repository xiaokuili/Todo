import { useState } from 'react';
import { Circle, ArrowRight, CheckCircle2, Trash2, Plus, X } from 'lucide-react';
import { TimePicker } from './TimePicker';
import { api } from '../api';

// ============================================================================
// Todo Card 组件
// ============================================================================
// 如需调整 todo card 的 UI，主要修改以下部分：
// - JSX 结构（状态图标、任务名称、步骤等）
// - 样式类名
// ============================================================================

const statusIcon = {
  pending: Circle,
  in_progress: ArrowRight,
  completed: CheckCircle2,
};

const statusColor = {
  pending: 'text-slate-400',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
};

export function TodoCard({ todo, onUpdate, onDelete }) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const StatusIcon = statusIcon[todo.status] || Circle;
  const isCompleted = todo.status === 'completed';

  const handleCycleStatus = async () => {
    const statusCycle = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusCycle.indexOf(todo.status || 'pending');
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
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

  const handleAddStep = async () => {
    const stepText = prompt('请输入步骤内容:');
    if (!stepText?.trim()) return;

    const currentSteps = todo.steps || [];
    const newStep = `[ ] ${stepText.trim()}`;
    await api.updateTodo(todo.id, { steps: [...currentSteps, newStep] });
    onUpdate?.();
  };

  const handleToggleStep = async (stepIndex) => {
    const currentSteps = todo.steps || [];
    if (stepIndex < 0 || stepIndex >= currentSteps.length) return;

    const step = currentSteps[stepIndex].trim();
    const isCompleted = /^\[[xX]\]/.test(step);
    const stepText = step.replace(/^\[[ xX]?\]\s*/, '');

    const newStep = isCompleted ? `[ ] ${stepText}` : `[x] ${stepText}`;
    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = newStep;

    await api.updateTodo(todo.id, { steps: updatedSteps });
    onUpdate?.();
  };

  const handleDeleteStep = async (stepIndex) => {
    if (!confirm('确定要删除这个步骤吗？')) return;

    const currentSteps = todo.steps || [];
    const updatedSteps = currentSteps.filter((_, index) => index !== stepIndex);
    await api.updateTodo(todo.id, { steps: updatedSteps });
    onUpdate?.();
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
            className={`${statusColor[todo.status] || 'text-slate-400'} flex-shrink-0 hover:opacity-70 transition-opacity`}
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
                } font-medium bg-transparent border-none outline-none focus:bg-slate-50 rounded px-2 py-1 -mx-2 -my-1`}
                placeholder="任务名称"
              />
            </div>

            {/* 描述和步骤 */}
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              {todo.description && (
                <p className="text-xs text-slate-600">{todo.description}</p>
              )}

              {/* 步骤列表 */}
              {todo.steps && todo.steps.length > 0 && (
                <div className="space-y-1">
                  {todo.steps.map((step, index) => {
                    const trimmed = step.trim();
                    const isCompleted = /^\[[xX]\]/.test(trimmed);
                    const stepText = trimmed.replace(/^\[[ xX]?\]\s*/, '');

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-2 text-xs group/step ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleStep(index)}
                          className="flex-shrink-0 hover:opacity-70 transition-opacity"
                          title="点击切换完成状态"
                        >
                          {isCompleted ? '✓' : '○'}
                        </button>
                        <span className="flex-1">{stepText}</span>
                        <button
                          onClick={() => handleDeleteStep(index)}
                          className="opacity-0 group-hover/step:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
                          title="删除步骤"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 添加步骤按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddStep}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                  title="添加步骤"
                >
                  <Plus className="w-3 h-3" />
                  添加步骤
                </button>
              </div>
            </div>
          </div>

          {/* 删除按钮 */}
          <button
            onClick={() => {
              if (confirm('确定要删除这个待办事项吗？')) {
                onDelete?.(todo.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

