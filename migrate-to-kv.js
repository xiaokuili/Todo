const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const TODO_DIR = path.join(__dirname, 'todos');
const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID || '';

if (!KV_NAMESPACE_ID) {
  console.error('❌ 请设置环境变量 KV_NAMESPACE_ID');
  console.log('使用方法: KV_NAMESPACE_ID=你的KV命名空间ID node migrate-to-kv.js');
  process.exit(1);
}

async function migrateToKV() {
  console.log('🚀 开始迁移数据到 Cloudflare KV...\n');

  if (!fs.existsSync(TODO_DIR)) {
    console.error('❌ todos 目录不存在');
    process.exit(1);
  }

  const files = fs.readdirSync(TODO_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('⚠️  没有找到需要迁移的 JSON 文件');
    return;
  }

  console.log(`📦 找到 ${jsonFiles.length} 个文件需要迁移\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(TODO_DIR, file);

    try {
      const data = fs.readFileSync(filePath, 'utf8');

      // 验证 JSON 格式
      JSON.parse(data);

      // 使用 wrangler 写入 KV
      const key = file;
      const escapedData = data.replace(/'/g, "'\\''");
      const cmd = `wrangler kv:key put "${key}" '${escapedData}' --namespace-id=${KV_NAMESPACE_ID}`;

      execSync(cmd, { stdio: 'pipe' });

      console.log(`✅ ${file}`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file}: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 迁移完成！`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${failCount}`);
  console.log('='.repeat(50));
}

migrateToKV().catch(error => {
  console.error('❌ 迁移过程出错:', error);
  process.exit(1);
});
