import React, { useState } from 'react';
import { Survey } from 'survey-react';
import 'survey-react/survey.min.css';
import axios from 'axios';

function App() {
  const [surveyJson, setSurveyJson] = useState({ elements: [] });
  const [questionType, setQuestionType] = useState('text');
  const [questionTitle, setQuestionTitle] = useState('');
  const [surveyId, setSurveyId] = useState(null);

  const addQuestion = () => {
    let newQuestion = { name: `q${surveyJson.elements.length + 1}`, title: questionTitle };
    if (questionType === 'radiogroup') {
      newQuestion.type = 'radiogroup';
      newQuestion.choices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ value: n, text: `${n}` }));
    } else {
      newQuestion.type = 'text';
    }
    setSurveyJson({
      elements: [...surveyJson.elements, newQuestion]
    });
    setQuestionTitle(''); // Reset input
  };

  const saveSurvey = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/surveys', surveyJson);
      setSurveyId(response.data.id);
      alert(`Survey saved! Share this link: http://localhost:3000/survey/${response.data.id}`);
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Failed to save survey');
    }
  };

  const onComplete = async (survey) => {
    if (surveyId) {
      try {
        await axios.post('http://localhost:5000/api/responses', {
          surveyId,
          data: survey.data
        });
        alert('Response saved!');
      } catch (error) {
        console.error('Error saving response:', error);
        alert('Failed to save response');
      }
    } else {
      alert('Please save the survey first!');
    }
  };

  return (
    <div>
      <h1>My NPS Platform</h1>
      <div>
        <h2>Create a Question</h2>
        <select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
          <option value="text">Text</option>
          <option value="radiogroup">Rating (0-10)</option>
        </select>
        <input
          type="text"
          value={questionTitle}
          onChange={(e) => setQuestionTitle(e.target.value)}
          placeholder="Enter question title"
        />
        <button onClick={addQuestion}>Add Question</button>
        <button onClick={saveSurvey}>Save Survey</button>
      </div>
      {surveyJson.elements.length > 0 && <Survey json={surveyJson} onComplete={onComplete} />}
    </div>
  );
}

export default App;