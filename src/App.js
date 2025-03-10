import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { Survey } from 'survey-react';
import 'survey-react/survey.min.css';
import axios from 'axios';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{isSignup ? 'Sign Up' : 'Log In'}</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAuth}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          {isSignup ? 'Sign Up' : 'Log In'}
        </button>
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="w-full mt-2 text-blue-500 hover:underline"
        >
          {isSignup ? 'Switch to Log In' : 'Switch to Sign Up'}
        </button>
      </div>
    </div>
  );
}

function SurveyEditor({ user, surveyId, initialSurvey }) {
  const [surveyJson, setSurveyJson] = useState(initialSurvey || { elements: [], title: '' });
  const [questionType, setQuestionType] = useState('text');
  const [questionTitle, setQuestionTitle] = useState('');
  const [choices, setChoices] = useState('');
  const [hasComment, setHasComment] = useState(false);
  const [commentDisplay, setCommentDisplay] = useState('comment');
  const [commentLabel, setCommentLabel] = useState('Other (please specify)');
  const navigate = useNavigate();

  const addQuestion = () => {
    let newQuestion = { name: `q${surveyJson.elements.length + 1}`, title: questionTitle };

    switch (questionType) {
      case 'text':
        newQuestion.type = 'text';
        break;
      case 'radiogroup':
        newQuestion.type = 'radiogroup';
        newQuestion.choices = choices
          ? choices.split(',').map(choice => ({ value: choice.trim(), text: choice.trim() }))
          : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ value: n, text: `${n}` }));
        break;
      case 'dropdown':
        newQuestion.type = 'dropdown';
        newQuestion.choices = choices
          ? choices.split(',').map(choice => ({ value: choice.trim(), text: choice.trim() }))
          : ['Option 1', 'Option 2', 'Option 3'].map(opt => ({ value: opt, text: opt }));
        break;
      case 'checkbox':
        newQuestion.type = 'checkbox';
        newQuestion.choices = choices
          ? choices.split(',').map(choice => ({ value: choice.trim(), text: choice.trim() }))
          : ['Choice 1', 'Choice 2', 'Choice 3'].map(ch => ({ value: ch, text: ch }));
        break;
      default:
        newQuestion.type = 'text';
    }

    if (hasComment) {
      if (commentDisplay === 'choice') {
        newQuestion.hasOther = true;
        newQuestion.otherText = commentLabel;
      } else if (commentDisplay === 'comment') {
        newQuestion.hasComment = true;
        newQuestion.commentText = commentLabel;
      }
    }

    setSurveyJson({
      ...surveyJson,
      elements: [...surveyJson.elements, newQuestion]
    });
    setQuestionTitle('');
    setChoices('');
    setHasComment(false);
    setCommentDisplay('comment');
    setCommentLabel('Other (please specify)');
  };

  const saveSurvey = async () => {
    if (!surveyJson.title.trim()) {
      alert('Please enter a survey title.');
      return;
    }
    try {
      if (surveyId) {
        // Update existing survey
        await axios.put(`http://localhost:5000/api/surveys/${surveyId}`, {
          ...surveyJson,
          userId: user.uid,
          updatedAt: new Date().toISOString()
        });
        alert('Survey updated!');
      } else {
        // Create new survey
        const response = await axios.post('http://localhost:5000/api/surveys', {
          ...surveyJson,
          userId: user.uid
        });
        alert(`Survey saved! Share this link: http://localhost:3000/survey/${response.data.id}`);
      }
      setSurveyJson({ elements: [], title: '' });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Failed to save survey');
    }
  };

  const onComplete = async (survey) => {
    if (surveyId) {
      if (!survey.data || Object.keys(survey.data).length === 0) {
        alert('No responses provided. Please answer at least one question.');
        return;
      }
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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate('/dashboard')} className="mr-4 hover:underline">Dashboard</button>
            <button onClick={() => signOut(auth)} className="hover:underline">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">{surveyId ? 'Edit Survey' : 'Create a Survey'}</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={surveyJson.title}
              onChange={(e) => setSurveyJson({ ...surveyJson, title: e.target.value })}
              placeholder="Enter survey title"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <h3 className="text-lg font-medium mt-4">Add a Question</h3>
            <div className="flex space-x-4">
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="radiogroup">Rating/Multiple Choice</option>
                <option value="dropdown">Dropdown</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <input
                type="text"
                value={questionTitle}
                onChange={(e) => setQuestionTitle(e.target.value)}
                placeholder="Enter question title"
                className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(questionType === 'radiogroup' || questionType === 'dropdown' || questionType === 'checkbox') && (
              <input
                type="text"
                value={choices}
                onChange={(e) => setChoices(e.target.value)}
                placeholder="Enter choices (comma-separated, e.g., Yes,No,Maybe)"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasComment}
                onChange={(e) => setHasComment(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500"
              />
              <label className="text-sm">Add Comment/Other Box</label>
            </div>
            {hasComment && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="choice"
                    checked={commentDisplay === 'choice'}
                    onChange={(e) => setCommentDisplay(e.target.value)}
                    className="h-4 w-4 text-blue-500 focus:ring-blue-500"
                  />
                  <label>Display as answer choice (free-text)</label>
                  <input
                    type="radio"
                    value="comment"
                    checked={commentDisplay === 'comment'}
                    onChange={(e) => setCommentDisplay(e.target.value)}
                    className="h-4 w-4 text-blue-500 focus:ring-blue-500 ml-4"
                  />
                  <label>Display as comment field</label>
                </div>
                <input
                  type="text"
                  value={commentLabel}
                  onChange={(e) => setCommentLabel(e.target.value)}
                  placeholder="Label (e.g., Other (please specify))"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex space-x-4">
              <button
                onClick={addQuestion}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                Add Question
              </button>
              <button
                onClick={saveSurvey}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                {surveyId ? 'Update Survey' : 'Save Survey'}
              </button>
            </div>
          </div>
          {surveyJson.elements.length > 0 && (
            <div className="mt-6">
              <Survey json={surveyJson} onComplete={onComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  const [surveys, setSurveys] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/surveys?userId=${user.uid}`)
      .then(response => {
        // Sort surveys by updatedAt (most recent first)
        const sortedSurveys = response.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setSurveys(sortedSurveys);
      })
      .catch(error => console.error('Error fetching surveys:', error));
  }, [user.uid]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate('/')} className="mr-4 hover:underline">Create Survey</button>
            <button onClick={() => signOut(auth)} className="hover:underline">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Surveys</h2>
          {surveys.length === 0 ? (
            <p>No surveys yet.</p>
          ) : (
            <ul className="space-y-4">
              {surveys.map(survey => (
                <li key={survey.id} className="border-b py-2">
                  <Link
                    to={`/survey/${survey.id}/details`}
                    className="text-blue-500 hover:underline font-medium text-lg"
                  >
                    {survey.title || `Untitled Survey #${survey.id}`}
                  </Link>
                  <div className="text-sm text-gray-600 mt-1">
                    ID: {survey.id} | Questions: {survey.elements.length} | 
                    Last Updated: {new Date(survey.updatedAt || Date.now()).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SurveyDetailPage({ user }) {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/surveys/${id}`)
      .then(response => setSurvey(response.data))
      .catch(error => {
        console.error('Error fetching survey:', error);
        setSurvey(null);
      });

    axios.get(`http://localhost:5000/api/responses?surveyId=${id}`)
      .then(response => setResponses(response.data))
      .catch(error => console.error('Error fetching responses:', error));
  }, [id]);

  const handleDelete = async () => {
    if (responses.length > 0) {
      if (!window.confirm('This survey has responses. Are you sure you want to delete it?')) {
        return;
      }
    }
    try {
      await axios.delete(`http://localhost:5000/api/surveys/${id}`);
      await axios.delete(`http://localhost:5000/api/responses/${id}`);
      alert('Survey deleted!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert('Failed to delete survey');
    }
  };

  if (!survey) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate('/dashboard')} className="mr-4 hover:underline">Dashboard</button>
            <button onClick={() => signOut(auth)} className="hover:underline">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">{survey.title || `Untitled Survey #${survey.id}`}</h2>
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => navigate(`/survey/${id}/edit`)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Edit Survey
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
            >
              Delete Survey
            </button>
            <button
              onClick={() => navigate(`/survey/${id}/responses`)}
              className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              See Responses
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <p>ID: {survey.id}</p>
            <p>Questions: {survey.elements.length}</p>
            <p>Responses: {responses.length}</p>
            <p>Last Updated: {new Date(survey.updatedAt || Date.now()).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveyResponsesPage() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [viewMode, setViewMode] = useState('summaries'); // 'summaries' or 'single'
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/surveys/${id}`)
      .then(response => setSurvey(response.data))
      .catch(error => {
        console.error('Error fetching survey:', error);
        setSurvey(null);
      });

    axios.get(`http://localhost:5000/api/responses?surveyId=${id}`)
      .then(response => {
        console.log('Fetched responses:', response.data);
        setResponses(response.data);
      })
      .catch(error => console.error('Error fetching responses:', error));
  }, [id]);

  const processSurveyResults = () => {
    if (!survey) return null;

    const questions = survey.elements;
    const results = questions.map((question, index) => {
      const questionResponses = responses
        .filter(r => r.data && r.data[question.name] !== undefined)
        .map(r => r.data[question.name]);
      const commentResponses = responses
        .filter(r => r.data && r.data[`${question.name}-Comment`] !== undefined)
        .map(r => r.data[`${question.name}-Comment`]);

      if (question.type === 'radiogroup' || question.type === 'dropdown') {
        const choiceCounts = {};
        question.choices.forEach(choice => {
          choiceCounts[choice.text] = 0;
        });

        if (question.hasOther) {
          choiceCounts[question.otherText || 'Other'] = 0;
        }

        questionResponses.forEach(response => {
          if (response === 'other') {
            choiceCounts[question.otherText || 'Other'] += 1;
          } else {
            const choice = question.choices.find(c => c.value === response);
            if (choice) choiceCounts[choice.text] += 1;
          }
        });

        const chartData = {
          labels: [...question.choices.map(c => c.text), ...(question.hasOther ? [question.otherText || 'Other'] : [])],
          datasets: [
            {
              label: 'Responses',
              data: [...question.choices.map(c => choiceCounts[c.text]), ...(question.hasOther ? [choiceCounts[question.otherText || 'Other']] : [])],
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
          ],
        };

        return {
          title: question.title,
          type: question.type,
          chartData,
          comments: commentResponses,
        };
      }

      if (question.type === 'checkbox') {
        const choiceCounts = {};
        question.choices.forEach(choice => {
          choiceCounts[choice.text] = 0;
        });

        if (question.hasOther) {
          choiceCounts[question.otherText || 'Other'] = 0;
        }

        questionResponses.forEach(response => {
          if (Array.isArray(response)) {
            response.forEach(val => {
              if (val === 'other') {
                choiceCounts[question.otherText || 'Other'] += 1;
              } else {
                const choice = question.choices.find(c => c.value === val);
                if (choice) choiceCounts[choice.text] += 1;
              }
            });
          }
        });

        const chartData = {
          labels: [...question.choices.map(c => c.text), ...(question.hasOther ? [question.otherText || 'Other'] : [])],
          datasets: [
            {
              label: 'Responses',
              data: [...question.choices.map(c => choiceCounts[c.text]), ...(question.hasOther ? [choiceCounts[question.otherText || 'Other']] : [])],
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1,
            },
          ],
        };

        return {
          title: question.title,
          type: question.type,
          chartData,
          comments: commentResponses,
        };
      }

      return {
        title: question.title,
        type: question.type,
        responses: questionResponses,
        comments: commentResponses,
      };
    });

    return { surveyId: id, questions: results };
  };

  if (!survey) return <p>Loading...</p>;

  const results = processSurveyResults();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <Link to={`/survey/${id}/details`} className="mr-4 hover:underline">Back to Survey Details</Link>
            <Link to="/dashboard" className="mr-4 hover:underline">Dashboard</Link>
            <button onClick={() => signOut(auth)} className="hover:underline">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Responses for: {survey.title || `Untitled Survey #${survey.id}`}</h2>
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => {
                setViewMode('summaries');
                setSelectedResponse(null);
              }}
              className={`p-2 rounded ${viewMode === 'summaries' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Question Summaries
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`p-2 rounded ${viewMode === 'single' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Single Responses
            </button>
          </div>

          {viewMode === 'summaries' && results && (
            <div>
              {results.questions.map((questionResult, index) => (
                <div key={index} className="mb-6">
                  <h4 className="text-md font-semibold">{questionResult.title}</h4>
                  {questionResult.type === 'radiogroup' || questionResult.type === 'dropdown' || questionResult.type === 'checkbox' ? (
                    <div className="mt-4">
                      <Bar
                        data={questionResult.chartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: 'Response Distribution' },
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Responses:</p>
                      <ul className="list-disc pl-5">
                        {questionResult.responses.map((resp, idx) => (
                          <li key={idx} className="text-sm">{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {questionResult.comments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Comments:</p>
                      <ul className="list-disc pl-5">
                        {questionResult.comments.map((comment, idx) => (
                          <li key={idx} className="text-sm">{comment}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === 'single' && (
            <div>
              {responses.length === 0 ? (
                <p>No responses yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Responses</h3>
                    <ul className="space-y-2">
                      {responses.map((response, index) => (
                        <li
                          key={response.id}
                          className={`p-2 rounded cursor-pointer ${selectedResponse === response ? 'bg-blue-100' : 'bg-gray-100'}`}
                          onClick={() => setSelectedResponse(response)}
                        >
                          Response {index + 1}
                          <div className="text-sm text-gray-600">
                            Started: {new Date(response.timestamp).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    {selectedResponse ? (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Response Details</h3>
                        <div className="text-sm text-gray-600 mb-4">
                          <p>Started: {new Date(selectedResponse.timestamp).toLocaleString()}</p>
                          {/* IP Address placeholder (not captured currently) */}
                          <p>IP Address: Not available</p>
                        </div>
                        {survey.elements.map((question, index) => (
                          <div key={index} className="mb-4">
                            <p className="font-semibold">Q{index + 1}: {question.title}</p>
                            <p className="text-sm">
                              {selectedResponse.data[question.name] || 'Not answered'}
                            </p>
                            {selectedResponse.data[`${question.name}-Comment`] && (
                              <p className="text-sm mt-1">
                                Comment: {selectedResponse.data[`${question.name}-Comment`]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Select a response to view details.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SurveyPage() {
  const { id } = useParams();
  const [surveyJson, setSurveyJson] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/surveys/${id}`)
      .then(response => setSurveyJson(response.data))
      .catch(error => {
        console.error('Error fetching survey:', error);
        setSurveyJson({ elements: [{ type: 'text', name: 'error', title: 'Survey not found' }] });
      });
  }, [id]);

  const onComplete = async (survey) => {
    if (!survey.data || Object.keys(survey.data).length === 0) {
      alert('No responses provided. Please answer at least one question.');
      return;
    }
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">{surveyJson?.title || 'Untitled Survey'}</h1>
        {surveyJson ? <Survey json={surveyJson} onComplete={onComplete} /> : <p>Loading...</p>}
      </div>
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
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/survey/:id/details"
          element={user ? <SurveyDetailPage user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/survey/:id/edit"
          element={user ? <SurveyEditor user={user} surveyId={useParams().id} initialSurvey={null} /> : <Navigate to="/" />}
        />
        <Route
          path="/survey/:id/responses"
          element={<SurveyResponsesPage />}
        />
        <Route path="/survey/:id" element={<SurveyPage />} />
      </Routes>
    </Router>
  );
}

export default App;