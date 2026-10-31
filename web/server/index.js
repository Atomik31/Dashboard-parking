import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
let app;
try {
  app = createApp();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
app.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));
