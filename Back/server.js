require("dotenv").config();

const app = require("./src/app");

const http = require("http");
const { initSocket } = require("./src/socket");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

// Reset all users to offline on startup
const User = require("./src/models/User");
User.updateMany({}, { isOnline: false }).then(() => {
  console.log("All users set to offline on startup");
}).catch(err => {
  console.error("Error resetting user status:", err);
});

server.listen(PORT, () => {
  const { getBackendUrl, getFrontendUrl } = require("./src/config/urls");
  console.log(`--------------------------------------------------`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Backend URL: ${getBackendUrl()}`);
  console.log(`Frontend URL: ${getFrontendUrl()}`);
  console.log(`Google Callback: ${getBackendUrl()}/api/auth/google/callback`);
  console.log(`--------------------------------------------------`);
});
