/**
 * 精软导航站 - 全自动构建与推送脚本
 * 用途：一键打包 (含 SEO 注入) 并推送到 GitHub
 * 使用方法：在终端运行 `node push.js`
 */

import { execSync } from 'child_process';
import fs from 'fs';

// --- 配置区域 ---
const CONFIG = {
  remoteUrl: 'git@github.com:wliuy/jingruan.git',
  branch: 'main',
  commitMsg: 'feat: 更新站点内容并进行 SEO 预渲染优化'
};

function run(command) {
  try {
    console.log(`\x1b[36m正在执行: ${command}\x1b[0m`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

async function start() {
  console.log('\x1b[33m🚀 开始执行全自动构建与推送流程...\x1b[0m\n');

  // 1. 推送前强制执行打包 (包含 SEO 注入逻辑)
  console.log('正在执行打包任务...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\x1b[32m✨ 打包与 SEO 注入成功！\x1b[0m');
  } catch (e) {
    console.error('\x1b[31m❌ 打包失败，终止流程！请检查代码是否有语法错误。\x1b[0m');
    process.exit(1);
  }

  // 2. 检查并初始化 Git
  if (!fs.existsSync('.git')) {
    console.log('检测到尚未初始化 Git，正在初始化...');
    run('git init');
  }

  // 3. 校准分支与远程仓库
  run(`git branch -M ${CONFIG.branch}`);
  run(`git remote add origin ${CONFIG.remoteUrl}`);

  // 4. 添加所有文件 (注意：如果你的 .gitignore 忽略了 dist，
  // 这里依然可以只提交源码，利用 EdgeOne 自动构建)
  run('git add .');

  // 5. 提交改动
  console.log('正在创建提交记录...');
  try {
    execSync(`git commit -m "${CONFIG.commitMsg}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('\x1b[32m提示：没有检测到新改动，无需提交。\x1b[0m');
  }

  // 6. 推送
  console.log(`\n\x1b[35m正在推送到 GitHub (${CONFIG.branch})...\x1b[0m`);
  const success = run(`git push -f origin ${CONFIG.branch}`);

  if (success) {
    console.log('\n\x1b[32m🎉 推送成功！EdgeOne 应该已经在自动构建了。\x1b[0m');
  } else {
    console.log('\n\x1b[31m❌ 推送失败，请检查网络或 GitHub Token。\x1b[0m');
  }
}

start();