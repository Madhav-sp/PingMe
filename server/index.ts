import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer, type SocketServer } from "./socket.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  initSocketServer(server as SocketServer);

  server.listen(port, () => {
    console.log(`> PingMe ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized`);
  });
});
