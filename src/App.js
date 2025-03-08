import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams, Navigate } from 'react-router-dom';
import { Survey } from 'survey-react';
import 'survey-react/survey.min.css';
import axios from 'axios';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleAuth = async () => {
    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h1>{isSignup ? 'Sign Up' : 'Log In'}</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleAuth}>{isSignup ? 'Sign Up' : 'Log In'}</button>
      <button onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? 'Switch to Log In' : 'Switch to Sign Up'}
      </button>
    </div>
  );
}

function SurveyEditor({ user }) {
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
    setQuestionTitle('');
  };

  const saveSurvey = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/surveys', {
        ...surveyJson,
        userId: user.uid // Tie survey to the user
      });
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
    }
  };

  return (
    <div>
      <h1>My NPS Platform</h1>
      <button onClick={() => signOut(auth)}>Log Out</button>
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

function SurveyPage() {
  const { id } = useParams();
  const [surveyJson, setSurveyJson] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/surveys/${id}`)
      .then(response => {
        setSurveyJson(response.data);
      })
      .catch(error => {
        console.error('Error fetching survey:', error);
        setSurveyJson({ elements: [{ type: 'text', name: 'error', title: 'Survey not found' }] });
      });
  }, [id]);

  const onComplete = async (survey) => {
    try {
      await axios.post('http://localhost:5000/api/responses', {
        surveyId: id,
        data: survey.data
      });
      alert('Response saved!');
    } catch (error) {
      console.error('Error saving response:', error);
      alert('Failed to save response');
    }
  };

  return (
    <div>
      <h1>Take the Survey</h1>
      {surveyJson ? <Survey json={surveyJson} onComplete={onComplete} /> : <p>Loading...</p>}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <SurveyEditor user={user} /> : <LoginPage setUser={setUser} />}
        />
        <Route path="/survey/:id" element={<SurveyPage />} />
      </Routes>
    </Router>
  );
}

export default App;