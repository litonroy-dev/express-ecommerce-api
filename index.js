const express = require("express");
const app = express();

app.use(express.raw());

app.locals.appName = "My Express API";
app.locals.version = "1.0.0";

app.get("/", (req, res) => {
  res.send(app.locals.appName);
});

const parent = express.Router();
const child = express.Router({ mergeParams: true });

parent.use("/user/:userId", child);
app.get("/test", (req, res) => {
  res.send("Hello");
  res.send("World");
});
child.get("/comments", (req, res) => {
  res.json({
    name: "Liton",
    role: "Frontend Developer",
  });
});

// Mount parent router
app.use(parent);



app.post("/upload", (req, res) => {
  console.log(Buffer.isBuffer(req.body));

  res.send(`Received ${req.body.length} bytes`);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
