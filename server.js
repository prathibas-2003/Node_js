
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));

const configPath = path.join(__dirname, "fareConfig.json");
const logsPath = path.join(__dirname, "rideLogs.json");

// Read fare configuration
function readFareConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

// Read previous ride history
function readRideLogs() {
  try {
    if (!fs.existsSync(logsPath)) return [];

    const data = fs.readFileSync(logsPath, "utf8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Could not read ride history:", error.message);
    return [];
  }
}

// Save ride history
function saveRideLogs(logs) {
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
}

// Escape HTML to prevent unsafe user input from being rendered
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Home page
function renderHome(errorMessage = "") {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto Fare Fairness Checker</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f6fb;
      margin: 0;
      padding: 20px;
    }

    .container {
      max-width: 900px;
      margin: auto;
    }

    .header {
      background: #13294b;
      color: white;
      padding: 22px;
      border-radius: 12px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      color: #ffd700;
    }

    .card {
      background: white;
      margin-top: 20px;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,.1);
    }

    label {
      display: block;
      margin-top: 12px;
      font-weight: bold;
    }

    input {
      width: 100%;
      padding: 12px;
      margin-top: 6px;
      margin-bottom: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-sizing: border-box;
    }

    button {
      width: 100%;
      padding: 12px;
      background: #1565c0;
      color: white;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
    }

    button:hover {
      background: #0d47a1;
    }

    .error {
      color: #b00020;
      background: #ffebee;
      padding: 10px;
      border-radius: 6px;
    }
  </style>
</head>

<body>
  <div class="container">

    <div class="header">
      <h1>🚖 Auto Fare Fairness Checker</h1>
      <p>Check if your auto fare is fair or overpriced!</p>
    </div>

    <div class="card">
      <h2>Enter Ride Details</h2>

      ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ""}

      <form method="GET" action="/">

        <label>Distance (km)</label>
        <input type="number" step="0.1" min="0"
          name="distance" required>

        <label>Waiting Time (minutes)</label>
        <input type="number" step="1" min="0"
          name="waiting" required>

        <label>Actual Fare Paid (₹)</label>
        <input type="number" step="0.01" min="0"
          name="actualFare" required>

        <button type="submit">Calculate Fare</button>

      </form>
    </div>

  </div>
</body>
</html>`;
}

// Result page with detailed fare breakdown
function renderResult({
  distance,
  waiting,
  actualFare,
  baseFare,
  distanceCharge,
  waitingCharge,
  expectedFare,
  difference,
  status,
  statusColor,
  fareConfig,
  logs
}) {

  const historyRows = logs.map((ride, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(ride.distance)}</td>
      <td>${escapeHtml(ride.waiting)}</td>
      <td>₹${Number(ride.expectedFare).toFixed(2)}</td>
      <td>₹${Number(ride.actualFare).toFixed(2)}</td>
      <td>${escapeHtml(ride.status)}</td>
      <td>${escapeHtml(ride.date)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fare Result</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f6fb;
      margin: 0;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: auto;
    }

    .header {
      background: #13294b;
      padding: 20px;
      color: white;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 20px;
    }

    .result-box {
      background: #eaf7ea;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #cce0cc;
    }

    .status {
      color: ${statusColor};
      font-size: 30px;
      font-weight: bold;
      text-align: center;
    }

    .cards {
      display: flex;
      gap: 15px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .card {
      flex: 1;
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,.1);
      text-align: center;
      min-width: 180px;
    }

    .card h2 {
      color: #1565c0;
    }

    .breakdown {
      background: white;
      padding: 22px;
      margin-top: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,.1);
    }

    .breakdown h2 {
      color: #13294b;
      margin-top: 0;
    }

    .breakdown-row {
      display: flex;
      justify-content: space-between;
      padding: 13px 5px;
      border-bottom: 1px solid #ddd;
      gap: 15px;
    }

    .breakdown-row span:last-child {
      font-weight: bold;
      white-space: nowrap;
    }

    .total-row {
      background: #eaf2ff;
      padding: 15px;
      margin-top: 12px;
      border-radius: 7px;
      font-size: 19px;
      font-weight: bold;
    }

    .rules {
      margin-top: 20px;
      padding: 15px;
      background: #fff8e1;
      border-radius: 8px;
    }

    .history {
      background: white;
      padding: 20px;
      margin-top: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,.1);
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #13294b;
      color: white;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: center;
    }

    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 25px;
      background: #1565c0;
      color: white;
      text-decoration: none;
      border-radius: 6px;
    }

    @media(max-width: 600px) {
      .breakdown-row {
        font-size: 14px;
      }
    }
  </style>
</head>

<body>
  <div class="container">

    <div class="header">
      <h1>🚖 Auto Fare Fairness Checker</h1>
    </div>

    <div class="result-box">

      <div class="status">${status}</div>

      <div class="cards">

        <div class="card">
          <h3>Expected Fare</h3>
          <h2>₹${expectedFare.toFixed(2)}</h2>
        </div>

        <div class="card">
          <h3>You Paid</h3>
          <h2>₹${actualFare.toFixed(2)}</h2>
        </div>

        <div class="card">
          <h3>Difference</h3>
          <h2>₹${difference.toFixed(2)}</h2>
        </div>

      </div>

      <div class="breakdown">

        <h2>🧾 Detailed Fare Breakdown</h2>

        <div class="breakdown-row">
          <span>Base Fare</span>
          <span>₹${baseFare.toFixed(2)}</span>
        </div>

        <div class="breakdown-row">
          <span>
            Distance Charge (${distance} km × ₹${fareConfig.perKmRate})
          </span>
          <span>₹${distanceCharge.toFixed(2)}</span>
        </div>

        <div class="breakdown-row">
          <span>
            Waiting Charge (${waiting} min × ₹${fareConfig.waitingChargePerMinute})
          </span>
          <span>₹${waitingCharge.toFixed(2)}</span>
        </div>

        <div class="breakdown-row total-row">
          <span>Total Expected Fare</span>
          <span>₹${expectedFare.toFixed(2)}</span>
        </div>

        <div class="breakdown-row">
          <span>Actual Fare Paid</span>
          <span>₹${actualFare.toFixed(2)}</span>
        </div>

        <div class="breakdown-row">
          <span>Difference</span>
          <span>₹${difference.toFixed(2)}</span>
        </div>

      </div>

      <div class="rules">
        <h3>Fare Calculation Rules</h3>
        <p>Base Fare: ₹${baseFare.toFixed(2)}</p>
        <p>Per Kilometer: ₹${fareConfig.perKmRate}</p>
        <p>Waiting Charge Per Minute: ₹${fareConfig.waitingChargePerMinute}</p>
      </div>

      <a class="btn" href="/">Check Another Ride</a>

    </div>

    <div class="history">

      <h2>📋 Ride History</h2>

      <table>
        <tr>
          <th>#</th>
          <th>Distance (km)</th>
          <th>Waiting (min)</th>
          <th>Expected Fare</th>
          <th>Paid</th>
          <th>Status</th>
          <th>Date</th>
        </tr>

        ${historyRows || '<tr><td colspan="7">No ride history available.</td></tr>'}

      </table>

    </div>

  </div>
</body>
</html>`;
}

// Home page and fare calculation route
app.get("/", (req, res) => {

  const { distance, waiting, actualFare } = req.query;

  // Display home page when no values are submitted
  if (
    distance === undefined &&
    waiting === undefined &&
    actualFare === undefined
  ) {
    return res.send(renderHome());
  }

  // Convert input values into numbers
  const distanceValue = Number(distance);
  const waitingValue = Number(waiting);
  const actualFareValue = Number(actualFare);

  // Validate input
  if (
    distance === undefined || distance.trim() === "" ||
    waiting === undefined || waiting.trim() === "" ||
    actualFare === undefined || actualFare.trim() === "" ||
    !Number.isFinite(distanceValue) || distanceValue < 0 ||
    !Number.isFinite(waitingValue) || waitingValue < 0 ||
    !Number.isInteger(waitingValue) ||
    !Number.isFinite(actualFareValue) || actualFareValue < 0
  ) {
    return res.status(400).send(
      renderHome("Please enter valid non-negative numbers. Waiting time must be a whole number.")
    );
  }

  try {

    const fareConfig = readFareConfig();

    // Calculate individual fare components
    const baseFare = Number(fareConfig.baseFare);

    const distanceCharge =
      distanceValue * Number(fareConfig.perKmRate);

    const waitingCharge =
      waitingValue * Number(fareConfig.waitingChargePerMinute);

    // Calculate total expected fare
    const expectedFare =
      baseFare + distanceCharge + waitingCharge;

    // Calculate difference
    const difference = Math.abs(actualFareValue - expectedFare);

    // Determine fare status
    let status;
    let statusColor;

    if (actualFareValue > expectedFare) {
      status = "❌ Overpriced";
      statusColor = "red";
    } else if (actualFareValue < expectedFare) {
      status = "💰 Undercharged";
      statusColor = "orange";
    } else {
      status = "✅ Fair Fare";
      statusColor = "green";
    }

    // Save ride details
    const logs = readRideLogs();

    logs.push({
      date: new Date().toLocaleDateString(),
      distance: distanceValue,
      waiting: waitingValue,
      baseFare: Number(baseFare.toFixed(2)),
      distanceCharge: Number(distanceCharge.toFixed(2)),
      waitingCharge: Number(waitingCharge.toFixed(2)),
      expectedFare: Number(expectedFare.toFixed(2)),
      actualFare: Number(actualFareValue.toFixed(2)),
      difference: Number(difference.toFixed(2)),
      status
    });

    saveRideLogs(logs);

    // Display result page
    return res.send(renderResult({
      distance: distanceValue,
      waiting: waitingValue,
      actualFare: actualFareValue,
      baseFare,
      distanceCharge,
      waitingCharge,
      expectedFare,
      difference,
      status,
      statusColor,
      fareConfig,
      logs
    }));

  } catch (error) {

    console.error("Fare calculation failed:", error);

    return res.status(500).send(
      "An error occurred while calculating the fare. Please check fareConfig.json."
    );
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).send("Page not found. <a href='/'>Return to Home</a>");
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✅ Express server running at http://localhost:${PORT}`);
});
