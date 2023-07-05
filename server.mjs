import http from 'http';
import fs from 'fs';

const server = http.createServer((req, res) => {
  if (req.url === "/teapot.obj") {
    fs.readFile("teapot.obj", (err, data) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(data);
    });
    return;
  }

  if (req.url === "/teapot.mjs") {
    fs.readFile("teapot.mjs", (err, data) => {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end(data);
    });
    return;
  }

  fs.readFile("index.html", (err, data) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

server.listen(5033);