import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { Survey } from 'survey-react';
import 'survey-react/survey.min.css';
import axios from 'axios';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Set Axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Custom Sortable Item Component
const SortableItem = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '10px',
    marginBottom: '5px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{isSignUp ? 'Sign Up' : 'Login'}</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-500 hover:underline ml-1"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

function SurveyEditor({ user }) {
  const { id } = useParams();
  const [surveyJson, setSurveyJson] = useState({ pages: [{ elements: [] }], title: '', showPagesAsSeparate: false });
  const [currentPage, setCurrentPage] = useState(0);
  const [questionType, setQuestionType] = useState('text');
  const [questionTitle, setQuestionTitle] = useState('');
  const [choices, setChoices] = useState('');
  const [hasComment, setHasComment] = useState(false);
  const [commentDisplay, setCommentDisplay] = useState('comment');
  const [commentLabel, setCommentLabel] = useState('Other (please specify)');
  const [nonAnswerableText, setNonAnswerableText] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      axios.get(`/api/surveys/${id}`)
        .then(response => {
          const surveyData = response.data;
          if (!surveyData.pages) {
            surveyData.pages = [{ elements: surveyData.elements || [] }];
            delete surveyData.elements;
          }
          setSurveyJson(surveyData);
        })
        .catch(error => {
          console.error('Error fetching survey:', error);
          setSurveyJson({ pages: [{ elements: [] }], title: '', showPagesAsSeparate: false });
        });
    }
  }, [id]);

  const addQuestion = () => {
    let newQuestion = { name: `q${surveyJson.pages[currentPage].elements.length + 1}`, title: questionTitle };

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
      case 'nonanswerable':
        newQuestion.type = 'html';
        newQuestion.html = nonAnswerableText;
        break;
      default:
        newQuestion.type = 'text';
    }

    if (questionType !== 'nonanswerable' && hasComment) {
      if (commentDisplay === 'choice') {
        newQuestion.hasOther = true;
        newQuestion.otherText = commentLabel;
      } else if (commentDisplay === 'comment') {
        newQuestion.hasComment = true;
        newQuestion.commentText = commentLabel;
      }
    }

    if (questionType !== 'nonanswerable') {
      newQuestion.isRequired = isRequired;
    }

    const updatedPages = [...surveyJson.pages];
    updatedPages[currentPage].elements.push(newQuestion);

    setSurveyJson({
      ...surveyJson,
      pages: updatedPages
    });
    setQuestionTitle('');
    setChoices('');
    setHasComment(false);
    setCommentDisplay('comment');
    setCommentLabel('Other (please specify)');
    setNonAnswerableText('');
    setIsRequired(false);
  };

  const addSection = () => {
    setSurveyJson({
      ...surveyJson,
      pages: [...surveyJson.pages, { elements: [] }]
    });
    setCurrentPage(surveyJson.pages.length);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = surveyJson.pages[currentPage].elements.findIndex(item => item.name === active.id);
      const newIndex = surveyJson.pages[currentPage].elements.findIndex(item => item.name === over.id);
      const updatedElements = arrayMove(surveyJson.pages[currentPage].elements, oldIndex, newIndex);
      const updatedPages = [...surveyJson.pages];
      updatedPages[currentPage].elements = updatedElements;
      setSurveyJson({
        ...surveyJson,
        pages: updatedPages
      });
    }
  };

  const handleDeleteQuestion = (index) => {
    const updatedPages = [...surveyJson.pages];
    updatedPages[currentPage].elements.splice(index, 1);
    setSurveyJson({
      ...surveyJson,
      pages: updatedPages
    });
  };

  const saveSurvey = async () => {
    if (!surveyJson.title.trim()) {
      alert('Please enter a survey title.');
      return;
    }
    try {
      const surveyToSave = {
        ...surveyJson,
        userId: user.uid
      };
      if (id) {
        await axios.put(`/api/surveys/${id}`, {
          ...surveyToSave,
          updatedAt: new Date().toISOString()
        });
        alert('Survey updated!');
      } else {
        const response = await axios.post('/api/surveys', surveyToSave);
        alert(`Survey saved! Share this link: ${window.location.origin}/survey/${response.data.id}`);
      }
      setSurveyJson({ pages: [{ elements: [] }], title: '', showPagesAsSeparate: false });
      setCurrentPage(0);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Failed to save survey');
    }
  };

  const onComplete = async (survey) => {
    if (id) {
      if (!survey.data || Object.keys(survey.data).length === 0) {
        alert('No responses provided. Please answer at least one question.');
        return;
      }
      try {
        await axios.post('/api/responses', {
          surveyId: id,
          data: survey.data
        });
        alert('Response saved!');
      } catch (error) {
        console.error('Error saving response:', error);
        alert('Failed to save response');
      }
    }
  };

  const displaySurveyJson = surveyJson.showPagesAsSeparate ? surveyJson : {
    ...surveyJson,
    pages: [{ elements: surveyJson.pages.flatMap(page => page.elements) }]
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
          <h2 className="text-xl font-semibold mb-4">{id ? 'Edit Survey' : 'Create a Survey'}</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={surveyJson.title}
              onChange={(e) => setSurveyJson({ ...surveyJson, title: e.target.value })}
              placeholder="Enter survey title"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={surveyJson.showPagesAsSeparate}
                onChange={(e) => setSurveyJson({ ...surveyJson, showPagesAsSeparate: e.target.checked })}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500"
              />
              <label className="text-sm">Show sections as separate pages</label>
            </div>
            <div className="flex space-x-2">
              {surveyJson.pages.map((page, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`p-2 rounded ${currentPage === index ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Section {index + 1}
                </button>
              ))}
              <button
                onClick={addSection}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Section
              </button>
            </div>
            <h3 className="text-lg font-medium mt-4">Add a Question or Content to Section {currentPage + 1}</h3>
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
                <option value="nonanswerable">Non-Answerable Content</option>
              </select>
              {questionType === 'nonanswerable' ? (
                <input
                  type="text"
                  value={nonAnswerableText}
                  onChange={(e) => setNonAnswerableText(e.target.value)}
                  placeholder="Enter non-answerable content"
                  className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  placeholder="Enter question title"
                  className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
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
            {questionType !== 'nonanswerable' && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasComment}
                  onChange={(e) => setHasComment(e.target.checked)}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500"
                />
                <label className="text-sm">Add Comment/Other Box</label>
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 ml-4"
                />
                <label className="text-sm">Required</label>
              </div>
            )}
            {hasComment && questionType !== 'nonanswerable' && (
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
                {questionType === 'nonanswerable' ? 'Add Content' : 'Add Question'}
              </button>
              <button
                onClick={saveSurvey}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                {id ? 'Update Survey' : 'Save Survey'}
              </button>
            </div>
          </div>
          {surveyJson.pages.some(page => page.elements.length > 0) && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Survey Preview</h3>
              {surveyJson.pages.map((page, pageIndex) => (
                <div key={pageIndex} className="mb-4">
                  <h4 className="text-md font-semibold">Section {pageIndex + 1}</h4>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={page.elements.map(el => el.name)}>
                      <ul className="space-y-2">
                        {page.elements.map((element, index) => (
                          <SortableItem key={element.name} id={element.name}>
                            <div className="p-2 bg-gray-100 rounded flex items-center justify-between">
                              <div className="flex items-center">
                                {element.type === 'html' ? (
                                  <span dangerouslySetInnerHTML={{ __html: element.html }} />
                                ) : (
                                  <span>{element.title} {element.isRequired && <span className="text-red-500 ml-2">(Required)</span>}</span>
                                )}
                              </div>
                              {element.type !== 'html' && (
                                <button
                                  onClick={() => handleDeleteQuestion(index)}
                                  className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </SortableItem>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              ))}
              <Survey json={displaySurveyJson} onComplete={onComplete} />
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
    axios.get('/api/surveys', { params: { userId: user.uid } })
      .then(response => setSurveys(response.data))
      .catch(error => console.error('Error fetching surveys:', error));
  }, [user.uid]);

  const deleteSurvey = async (id) => {
    if (window.confirm('Are you sure you want to delete this survey?')) {
      try {
        await axios.delete(`/api/surveys/${id}`);
        setSurveys(surveys.filter(survey => survey.id !== id));
        await axios.delete(`/api/responses/${id}`);
      } catch (error) {
        console.error('Error deleting survey:', error);
        alert('Failed to delete survey');
      }
    }
  };

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
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map(survey => (
            <div key={survey.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">{survey.title}</h3>
              <p className="text-sm text-gray-500">
                Created: {new Date(survey.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-2 space-x-2">
                <Link
                  to={`/survey/${survey.id}/details`}
                  className="text-blue-500 hover:underline"
                >
                  Details
                </Link>
                <Link
                  to={`/survey/${survey.id}/edit`}
                  className="text-blue-500 hover:underline"
                >
                  Edit
                </Link>
                <Link
                  to={`/survey/${survey.id}/send`}
                  className="text-blue-500 hover:underline"
                >
                  Send
                </Link>
                <button
                  onClick={() => deleteSurvey(survey.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SurveyDetailPage({ user }) {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/api/surveys/${id}`)
      .then(response => {
        const surveyData = response.data;
        if (!surveyData.pages) {
          surveyData.pages = [{ elements: surveyData.elements || [] }];
          delete surveyData.elements;
        }
        setSurvey(surveyData);
      })
      .catch(error => console.error('Error fetching survey:', error));
  }, [id]);

  if (!survey) return <div>Loading...</div>;

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
          <h2 className="text-2xl font-bold mb-4">{survey.title}</h2>
          <p className="text-sm text-gray-500">
            Created: {new Date(survey.createdAt).toLocaleDateString()}
            {survey.updatedAt && ` | Updated: ${new Date(survey.updatedAt).toLocaleDateString()}`}
          </p>
          <Survey json={survey} mode="display" />
          <div className="mt-4">
            <Link to={`/survey/${id}/responses`} className="text-blue-500 hover:underline">
              View Responses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveySendPage() {
  const { id } = useParams();
  const surveyLink = `${window.location.origin}/survey/${id}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Share Your Survey</h2>
          <p className="mb-4">Use the link below to share your survey with others:</p>
          <input
            type="text"
            value={surveyLink}
            readOnly
            className="w-full p-2 border rounded focus:outline-none"
          />
          <button
            onClick={() => navigator.clipboard.writeText(surveyLink)}
            className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

function SurveyResponsesPage() {
  const { id } = useParams();
  const [responses, setResponses] = useState([]);
  const [survey, setSurvey] = useState(null);

  useEffect(() => {
    axios.get(`/api/surveys/${id}`)
      .then(response => {
        const surveyData = response.data;
        if (!surveyData.pages) {
          surveyData.pages = [{ elements: surveyData.elements || [] }];
          delete surveyData.elements;
        }
        setSurvey(surveyData);
      })
      .catch(error => console.error('Error fetching survey:', error));

    axios.get('/api/responses', { params: { surveyId: id } })
      .then(response => setResponses(response.data))
      .catch(error => console.error('Error fetching responses:', error));
  }, [id]);

  if (!survey) return <div>Loading...</div>;

  const calculateNps = () => {
    const npsQuestions = survey.pages.flatMap(page => page.elements.filter(q => q.type === 'radiogroup' && q.choices.some(c => c.value >= 0 && c.value <= 10)));
    if (npsQuestions.length === 0) return null;

    const npsScores = {};
    npsQuestions.forEach(question => {
      const questionResponses = responses.map(response => response.data[question.name]).filter(score => score !== undefined);
      const promoters = questionResponses.filter(score => score >= 9).length;
      const detractors = questionResponses.filter(score => score <= 6).length;
      const total = questionResponses.length;
      if (total > 0) {
        const nps = ((promoters - detractors) / total) * 100;
        npsScores[question.name] = nps.toFixed(2);
      }
    });

    return npsScores;
  };

  const npsScores = calculateNps();

  const chartData = {
    labels: npsScores ? Object.keys(npsScores) : [],
    datasets: [
      {
        label: 'NPS Score',
        data: npsScores ? Object.values(npsScores) : [],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Survey Responses</h2>
          {responses.length === 0 ? (
            <p>No responses yet.</p>
          ) : (
            <>
              {npsScores && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">NPS Scores</h3>
                  <Bar data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }} />
                </div>
              )}
              <h3 className="text-lg font-medium mb-2">Individual Responses</h3>
              {responses.map((response, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(response.timestamp).toLocaleString()}
                  </p>
                  {Object.entries(response.data).map(([question, answer]) => (
                    <div key={question} className="mt-2">
                      <p className="font-medium">{question}:</p>
                      <p>{JSON.stringify(answer)}</p>
                    </div>
                  ))}
                </div>
              ))}
            </>
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
    axios.get(`/api/surveys/${id}`)
      .then(response => {
        const surveyData = response.data;
        if (!surveyData.pages) {
          surveyData.pages = [{ elements: surveyData.elements || [] }];
          delete surveyData.elements;
        }
        setSurveyJson(surveyData);
      })
      .catch(error => console.error('Error fetching survey:', error));
  }, [id]);

  const onComplete = async (survey) => {
    if (!survey.data || Object.keys(survey.data).length === 0) {
      alert('No responses provided. Please answer at least one question.');
      return;
    }
    try {
      await axios.post('/api/responses', {
        surveyId: id,
        data: survey.data
      });
      alert('Thank you for your response!');
    } catch (error) {
      console.error('Error saving response:', error);
      alert('Failed to save response');
    }
  };

  if (!surveyJson) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">{surveyJson.title}</h2>
          <Survey json={surveyJson} onComplete={onComplete} />
        </div>
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
          element={user ? <SurveyEditor user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/survey/:id/send"
          element={user ? <SurveySendPage /> : <Navigate to="/" />}
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