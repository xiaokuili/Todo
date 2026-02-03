// Cloudflare Pages Functions API
// 使用 KV 存储代替文件系统

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 生成子任务 ID
function generateActionId() {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 加载所有待办事项
async function loadTodos(env) {
  try {
    const list = await env.TODO_KV.list();
    const allTodos = [];

    for (const key of list.keys) {
      if (key.name.endsWith('.json')) {
        const data = await env.TODO_KV.get(key.name, 'json');
        if (Array.isArray(data)) {
          allTodos.push(...data);
        }
      }
    }

    return allTodos;
  } catch (error) {
    console.error('加载 todos 失败:', error);
    return [];
  }
}

// 保存待办事项（按日期分组保存）
async function saveTodos(env, todos) {
  // 按日期分组
  const todosByDate = {};

  todos.forEach(todo => {
    let dateKey;
    if (todo.date) {
      dateKey = todo.date.split('T')[0];
    } else if (todo.created) {
      dateKey = new Date(todo.created).toISOString().split('T')[0];
    } else {
      dateKey = new Date().toISOString().split('T')[0];
    }

    if (!todosByDate[dateKey]) {
      todosByDate[dateKey] = [];
    }
    todosByDate[dateKey].push(todo);
  });

  // 保存到 KV
  const savePromises = [];
  for (const [dateKey, dateTodos] of Object.entries(todosByDate)) {
    const key = `${dateKey}.json`;
    if (dateTodos.length > 0) {
      savePromises.push(env.TODO_KV.put(key, JSON.stringify(dateTodos)));
    }
  }

  await Promise.all(savePromises);
}

// 路由处理
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 处理 OPTIONS 请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/todos - 获取所有待办事项
    if (path === '/api/todos' && method === 'GET') {
      const todos = await loadTodos(env);
      return new Response(JSON.stringify(todos), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/todos - 创建待办事项
    if (path === '/api/todos' && method === 'POST') {
      const body = await request.json();
      const todos = await loadTodos(env);

      const newTodo = {
        id: generateId(),
        name: body.name || '',
        description: body.description || '',
        project: body.project || '',
        start: body.start || null,
        end: body.end || null,
        date: body.date || new Date().toISOString().split('T')[0],
        steps: Array.isArray(body.steps) ? body.steps : (body.steps ? [body.steps] : []),
        status: body.status || null,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      todos.push(newTodo);
      await saveTodos(env, todos);

      return new Response(JSON.stringify(newTodo), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /api/todos/:id - 更新待办事项
    const updateMatch = path.match(/^\/api\/todos\/([^\/]+)$/);
    if (updateMatch && method === 'PUT') {
      const id = updateMatch[1];
      const body = await request.json();
      const todos = await loadTodos(env);

      const index = todos.findIndex(t => t.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ error: '未找到待办事项' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      todos[index] = {
        ...todos[index],
        ...body,
        updated: new Date().toISOString()
      };

      await saveTodos(env, todos);

      return new Response(JSON.stringify(todos[index]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /api/todos/:id - 删除待办事项
    const deleteMatch = path.match(/^\/api\/todos\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const id = deleteMatch[1];
      const todos = await loadTodos(env);

      const filtered = todos.filter(t => t.id !== id);
      if (filtered.length === todos.length) {
        return new Response(JSON.stringify({ error: '未找到待办事项' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await saveTodos(env, filtered);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/todos/:todoId/actions - 添加子任务
    const addActionMatch = path.match(/^\/api\/todos\/([^\/]+)\/actions$/);
    if (addActionMatch && method === 'POST') {
      const todoId = addActionMatch[1];
      const body = await request.json();
      const todos = await loadTodos(env);

      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        return new Response(JSON.stringify({ error: '未找到待办事项' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!todo.actionItems) {
        todo.actionItems = [];
      }

      const newAction = {
        id: generateActionId(),
        content: body.content || '',
        status: 'pending',
        startTime: null,
        endTime: null,
        duration: null,
        note: null,
        autoStopped: false
      };

      todo.actionItems.push(newAction);
      todo.updated = new Date().toISOString();

      await saveTodos(env, todos);

      return new Response(JSON.stringify(newAction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/todos/:todoId/actions/:actionId/start - 启动子任务
    const startActionMatch = path.match(/^\/api\/todos\/([^\/]+)\/actions\/([^\/]+)\/start$/);
    if (startActionMatch && method === 'POST') {
      const [, todoId, actionId] = startActionMatch;
      const todos = await loadTodos(env);

      const todo = todos.find(t => t.id === todoId);
      if (!todo || !todo.actionItems) {
        return new Response(JSON.stringify({ error: '未找到待办事项或子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const action = todo.actionItems.find(a => a.id === actionId);
      if (!action) {
        return new Response(JSON.stringify({ error: '未找到子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (action.status === 'running') {
        return new Response(JSON.stringify({ error: '子任务已经在运行中' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const now = new Date();
      action.status = 'running';
      action.startTime = now.toISOString();

      if (!todo.start) {
        const currentTime = now.toTimeString().slice(0, 5);
        todo.start = currentTime;
      }

      todo.updated = new Date().toISOString();
      await saveTodos(env, todos);

      return new Response(JSON.stringify({ action, todo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/todos/:todoId/actions/:actionId/stop - 停止子任务
    const stopActionMatch = path.match(/^\/api\/todos\/([^\/]+)\/actions\/([^\/]+)\/stop$/);
    if (stopActionMatch && method === 'POST') {
      const [, todoId, actionId] = stopActionMatch;
      const body = await request.json();
      const todos = await loadTodos(env);

      const todo = todos.find(t => t.id === todoId);
      if (!todo || !todo.actionItems) {
        return new Response(JSON.stringify({ error: '未找到待办事项或子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const action = todo.actionItems.find(a => a.id === actionId);
      if (!action || action.status !== 'running') {
        return new Response(JSON.stringify({ error: '未找到子任务或子任务未在运行中' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const endTime = new Date();
      const startTime = new Date(action.startTime);
      const duration = endTime - startTime;

      action.status = 'completed';
      action.endTime = endTime.toISOString();
      action.duration = duration;

      if (body.note) {
        action.note = body.note;
      }

      const MAX_DURATION = 40 * 60 * 1000;
      if (duration > MAX_DURATION) {
        action.autoStopped = true;
      }

      const currentTime = endTime.toTimeString().slice(0, 5);
      todo.end = currentTime;
      todo.updated = new Date().toISOString();

      await saveTodos(env, todos);

      return new Response(JSON.stringify({ action, todo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /api/todos/:todoId/actions/:actionId - 更新子任务
    const updateActionMatch = path.match(/^\/api\/todos\/([^\/]+)\/actions\/([^\/]+)$/);
    if (updateActionMatch && method === 'PUT') {
      const [, todoId, actionId] = updateActionMatch;
      const body = await request.json();
      const todos = await loadTodos(env);

      const todo = todos.find(t => t.id === todoId);
      if (!todo || !todo.actionItems) {
        return new Response(JSON.stringify({ error: '未找到待办事项或子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const action = todo.actionItems.find(a => a.id === actionId);
      if (!action) {
        return new Response(JSON.stringify({ error: '未找到子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (body.note !== undefined) {
        action.note = body.note;
      }

      if (body.content !== undefined) {
        action.content = body.content;
      }

      todo.updated = new Date().toISOString();
      await saveTodos(env, todos);

      return new Response(JSON.stringify(action), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /api/todos/:todoId/actions/:actionId - 删除子任务
    const deleteActionMatch = path.match(/^\/api\/todos\/([^\/]+)\/actions\/([^\/]+)$/);
    if (deleteActionMatch && method === 'DELETE') {
      const [, todoId, actionId] = deleteActionMatch;
      const todos = await loadTodos(env);

      const todo = todos.find(t => t.id === todoId);
      if (!todo || !todo.actionItems) {
        return new Response(JSON.stringify({ error: '未找到待办事项或子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const action = todo.actionItems.find(a => a.id === actionId);
      if (!action) {
        return new Response(JSON.stringify({ error: '未找到子任务' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      action.status = 'deleted';
      todo.updated = new Date().toISOString();

      await saveTodos(env, todos);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('请求处理错误:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Cloudflare Pages Functions 导出
export async function onRequest(context) {
  return handleRequest(context.request, context.env);
}
