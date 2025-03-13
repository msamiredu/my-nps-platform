const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

// Configure CORS to allow requests from localhost:3000 (dev) and production frontend
app.use(cors({
  origin: ["http://localhost:3000", "https://my-nps-platform.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies if needed
}));

app.use(express.json());

// Load or initialize surveys data
let surveys = [];
try {
  surveys = JSON.parse(fs.readFileSync("surveys.json", "utf8"));
} catch (error) {
  console.warn("No surveys.json found, initializing empty array");
  fs.writeFileSync("surveys.json", JSON.stringify(surveys));
}

// Load or initialize responses data
let responses = [];
try {
  responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));
} catch (error) {
  console.warn("No responses.json found, initializing empty array");
  fs.writeFileSync("responses.json", JSON.stringify(responses));
}

// API Endpoints
app.get("/api/surveys", (req, res) => {
  const userId = req.query.userId;
  const filteredSurveys = userId ? surveys.filter((s) => s.userId === userId) : surveys;
  res.json(filteredSurveys);
});

app.get("/api/surveys/:id", (req, res) => {
  const survey = surveys.find((s) => s.id === req.params.id);
  if (survey) {
    res.json(survey);
  } else {
    res.status(404).json({ message: "Survey not found" });
  }
});

app.post("/api/surveys", (req, res) => {
  const newSurvey = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  surveys.push(newSurvey);
  fs.writeFileSync("surveys.json", JSON.stringify(surveys, null, 2)); // Pretty print JSON
  res.status(201).json(newSurvey); // Use 201 for created resource
});

app.put("/api/surveys/:id", (req, res) => {
  const index = surveys.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    surveys[index] = {
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync("surveys.json", JSON.stringify(surveys, null, 2));
    res.json(surveys[index]);
  } else {
    res.status(404).json({ message: "Survey not found" });
  }
});

app.delete("/api/surveys/:id", (req, res) => {
  const initialLength = surveys.length;
  surveys = surveys.filter((s) => s.id !== req.params.id);
  if (surveys.length < initialLength) {
    fs.writeFileSync("surveys.json", JSON.stringify(surveys, null, 2));
    res.json({ message: "Survey deleted" });
  } else {
    res.status(404).json({ message: "Survey not found" });
  }
});

app.get("/api/responses", (req, res) => {
  const surveyId = req.query.surveyId;
  const filteredResponses = surveyId
    ? responses.filter((r) => r.surveyId === surveyId)
    : responses;
  res.json(filteredResponses);
});

app.post("/api/responses", (req, res) => {
  const newResponse = {
    ...req.body,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
  responses.push(newResponse);
  fs.writeFileSync("responses.json", JSON.stringify(responses, null, 2));
  res.status(201).json(newResponse);
});

app.delete("/api/responses/:id", (req, res) => {
  const initialLength = responses.length;
  responses = responses.filter((r) => r.id !== req.params.id); // Fixed: filter by id, not surveyId
  if (responses.length < initialLength) {
    fs.writeFileSync("responses.json", JSON.stringify(responses, null, 2));
    res.json({ message: "Response deleted" });
  } else {
    res.status(404).json({ message: "Response not found" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});