import express from "express";
import cors from "cors";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Barter Trade API is running",
  });
});

export default app;