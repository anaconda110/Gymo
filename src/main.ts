import './app.css';
import App from './App.svelte';
import { seedIfEmpty } from './lib/seed';
import { settings } from './lib/settings';

let app: App | undefined;

// 必须先完成种子化与设置加载再挂载应用，避免首屏页面读到空数据库的竞态。
async function bootstrap(): Promise<void> {
  await seedIfEmpty();
  await settings.load();
  app = new App({ target: document.getElementById('app')! });
}

void bootstrap();

export default app;