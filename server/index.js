const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

const surveysFile = path.join(__dirname, 'surveys.json');
const responsesFile = path.join(__dirname, 'responses.json');

if (!fs.existsSync(surveysFile)) fs.writeFileSync(surveysFile, JSON.stringify([]));
if (!fs.existsSync(responsesFile)) fs.writeFileSync(responsesFile, JSON.stringify([]));

// Get all surveys for a user
app.get('/api/surveys', (req, res) => {
  try {
    const userId = req.query.userId;
    const surveys = JSON.parse(fs.readFileSync(surveysFile));
    const userSurveys = userId ? surveys.filter(s => s.userId === userId) : surveys;
    res.json(userSurveys);
  } catch (error) {
    console.error('Error in GET /api/surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Create a new survey
app.post('/api/surveys', (req, res) => {
  try {
    const surveys = JSON.parse(fs.readFileSync(surveysFile));
    const newSurvey = { id: Date.now(), ...req.body };
    surveys.push(newSurvey);
    fs.writeFileSync(surveysFile, JSON.stringify(surveys));
    res.json(newSurvey);
  } catch (error) {
    console.error('Error in POST /api/surveys:', error);
    res.status(500).json({ error: 'Failed to save survey' });
  }
});

// Get a survey by ID
app.get('/api/surveys/:id', (req, res) => {
  try {
    const surveys = JSON.parse(fs.readFileSync(surveysFile));
    const survey = surveys.find(s => s.id === parseInt(req.params.id));
    res.json(survey || {});
  } catch (error) {
    console.error('Error in GET /api/surveys/:id:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

// Get responses for a user
app.get('/api/responses', (req, res) => {
  try {
    const userId = req.query.userId;
    const surveys = JSON.parse(fs.readFileSync(surveysFile)); // Define surveys here
    const responses = JSON.parse(fs.readFileSync(responsesFile));
    const userResponses = userId ? responses.filter(r => {
      const survey = surveys.find(s => s.id === r.surveyId);
      return survey && survey.userId === userId;
    }) : responses;
    res.json(userResponses);
  } catch (error) {
    console.error('Error in GET /api/responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Save a survey response
app.post('/api/responses', (req, res) => {
  try {
    const responses = JSON.parse(fs.readFileSync(responsesFile));
    const newResponse = { surveyId: req.body.surveyId, ...req.body.data, timestamp: new Date().toISOString() };
    responses.push(newResponse);
    fs.writeFileSync(responsesFile, JSON.stringify(responses));
    res.json(newResponse);
  } catch (error) {
    console.error('Error in POST /api/responses:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});