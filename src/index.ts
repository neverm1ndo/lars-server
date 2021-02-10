import './pre-start'; // Must be the first import
import app from '@server';

require("greenlock-express")
    .init({
        packageRoot: process.env.PKG_ROOT,
        configDir: "./greenlock.d",
        maintainerEmail: "it@nmnd.ru",
        cluster: false
    }).serve(app)

// Start the server
// const port = Number(process.env.HTTP_PORT || 3000);
// app.listen(port, () => { console.log(' DEV HTTP LLS listening on port', port) });
