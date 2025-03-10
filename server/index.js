const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Surveys data
let surveys = [];
let responses = [];

// Load surveys from file
const loadSurveys = () => {
  try {
    const data = fs.readFileSync('surveys.json', 'utf8');
    surveys = JSON.parse(data);
  } catch (error) {
    surveys = [];
  }
};

// Load responses from file
const loadResponses = () => {
  try {
    const data = fs.readFileSync('responses.json', 'utf8');
    responses = JSON.parse(data);
  } catch (error) {
    responses = [];
  }
};

// Save surveys to file
const saveSurveys = () => {
  fs.writeFileSync('surveys.json', JSON.stringify(surveys, null, 2));
};

// Save responses to file
const saveResponses = () => {
  fs.writeFileSync('responses.json', JSON.stringify(responses, null, 2));
};

// Initial load
loadSurveys();
loadResponses();

// API endpoints
app.get('/api/surveys', (req, res) => {
  const userId = req.query.userId;
  const userSurveys = surveys.filter(s => s.userId === userId);
  res.json(userSurveys);
});

app.get('/api/surveys/:id', (req, res) => {
  const survey = surveys.find(s => s.id === req.params.id);
  if (survey) {
    res.json(survey);
  } else {
    res.status(404).json({ error: 'Survey not found' });
  }
});

app.post('/api/surveys', (req, res) => {
  const newSurvey = {
    id: Date.now().toString(),
    ...req.body,
    userId: req.body.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  surveys.push(newSurvey);
  saveSurveys();
  res.json({ id: newSurvey.id });
});

app.get('/api/responses', (req, res) => {
  const userId = req.query.userId;
  const userResponses = responses.filter(r => {
    const survey = surveys.find(s => s.id === r.surveyId);
    return survey && survey.userId === userId;
  });
  res.json(userResponses);
});

app.post('/api/responses', (req, res) => {
  const newResponse = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  responses.push(newResponse);
  saveResponses();
  res.json({ message: 'Response saved' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});