const express = require('express');
const cors = require('cors'); // Add this line
const fs = require('fs');
const path = require('path');
const app = express();
const port = 5000;

app.use(express.json());
app.use(cors()); // Add this line to allow CORS

const surveysFile = path.join(__dirname, 'surveys.json');
const responsesFile = path.join(__dirname, 'responses.json');

if (!fs.existsSync(surveysFile)) fs.writeFileSync(surveysFile, JSON.stringify([]));
if (!fs.existsSync(responsesFile)) fs.writeFileSync(responsesFile, JSON.stringify([]));

app.get('/api/surveys', (req, res) => {
  const surveys = JSON.parse(fs.readFileSync(surveysFile));
  res.json(surveys);
});

app.post('/api/surveys', (req, res) => {
  const surveys = JSON.parse(fs.readFileSync(surveysFile));
  const newSurvey = { id: Date.now(), ...req.body };
  surveys.push(newSurvey);
  fs.writeFileSync(surveysFile, JSON.stringify(surveys));
  res.json(newSurvey);
});

app.get('/api/surveys/:id', (req, res) => {
  const surveys = JSON.parse(fs.readFileSync(surveysFile));
  const survey = surveys.find(s => s.id === parseInt(req.params.id));
  res.json(survey || {});
});

app.post('/api/responses', (req, res) => {
  const responses = JSON.parse(fs.readFileSync(responsesFile));
  const newResponse = { surveyId: req.body.surveyId, ...req.body.data, timestamp: new Date().toISOString() };
  responses.push(newResponse);
  fs.writeFileSync(responsesFile, JSON.stringify(responses));
  res.json(newResponse);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});