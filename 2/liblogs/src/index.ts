import './pre-start'; // Must be the first import
import app from '@server';
import { Logger } from '@shared/Logger';


// Start the server
const port = Number(process.env.HTTP_PORT || 3000);
app.listen(port, () => {
    Logger.log('default', 'HTTP LLS listening on port', port);
});
