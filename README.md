# Auto Fare Fairness Checker (Express version)

## Requirements
- Node.js installed

## Run in VS Code
1. Open this folder in VS Code.
2. Open Terminal > New Terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000 in your browser.

## Development mode
Run `npm run dev` to restart the server automatically when `server.js` changes (Node.js with `--watch` support required).

## Technologies
- Node.js
- Express.js
- HTML and CSS
- JSON file storage (`fareConfig.json`, `rideLogs.json`)

The app uses Express routing (`app.get`), request query parsing (`req.query`), middleware (`express.urlencoded`), and `app.listen`.
