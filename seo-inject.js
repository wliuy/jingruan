import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // 1. 读取本地最新的数据源文件
  const mockDataPath = path.join(__dirname, 'src/mock/mock_data.js');
  if (!fs.existsSync(mockDataPath)) {
    console.error('❌ 未找到数据源文件 src/mock/mock_data.js');
    process.exit(1);
  }
  const mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

  // 2. 正则匹配出导出的对象数据
  const exportMatch = mockDataContent.match(/export const mockData = ([\s\S]*)/);
  if (!exportMatch) {
    console.error('❌ 无法解析 mock_data.js 的导出结构');
    process.exit(1);
  }

  let jsonStr = exportMatch[1].trim();
  if (jsonStr.endsWith(';')) {
    jsonStr = jsonStr.slice(0, -1);
  }

  const data = JSON.parse(jsonStr);
  const categories = data.categories || [];

  // 3. 动态生成给百度爬虫看的纯 HTML 书签超链接结构
  // 🌟 核心修改：在最外层加一个隐藏的 div 容器，彻底消除页面加载时的文字闪烁
  let seoHtml = '\n    <div style="display:none;">\n';
  
  categories.forEach(cat => {
    seoHtml += `        <h3>${cat.name}</h3>\n`;
    if (Array.isArray(cat.sites)) {
      cat.sites.forEach(site => {
        seoHtml += `        <p><a href="${site.url}" title="${site.description || ''}">${site.name}</a> - ${site.description || ''}</p>\n`;
      });
    }
  });

  // 增加一个对爬虫友好的说明块 (去掉了内部多余的 display:none)
  seoHtml += `
        <div>
            <h1>精软导航 - 影视与资源汇总</h1>
            <p>精软导航为您提供：</p>
            <ul>
                <li>影视：热门影视资源索引</li>
                <li>无损音乐：高品质音乐下载资源</li>
                <li>在线工具：高效生产力在线工具汇总</li>
                <li>资源下载：各类软件与资料分享</li>
                <li>资源汇总：精选互联网资源聚合平台</li>
            </ul>
        </div>
  `;

  // 🌟 核心修改：闭合最外层的隐藏 div
  seoHtml += '\n    </div>\n';

  // 4. 读取打包后生成的 dist/index.html
  const htmlPath = path.join(__dirname, 'dist/index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ 未找到打包后的 dist/index.html 文件，请确保先运行了 vite build');
    process.exit(1);
  }
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // 5. 注入 SEO 内容
  const targetTag = '<div id="app"></div>';
  if (htmlContent.includes(targetTag)) {
    htmlContent = htmlContent.replace(targetTag, `<div id="app">${seoHtml}    </div>`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✨ SEO 预渲染成功！');
  } else {
    console.warn('⚠️ 未在 index.html 中找到 <div id="app"></div> 标签');
  }
} catch (error) {
  console.error('❌ SEO 预渲染脚本执行出错:', error);
}