/** Entry point: `npm start` runs this file. */
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const app = createApp(config);

app.listen(config.PORT, () => {
    process.stdout.write(
        `Willow Lodge is running at http://localhost:${config.PORT}\n`
    );
});
