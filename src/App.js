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

// Set Axios base URL explicitly for local development
axios.defaults.baseURL = 'http://localhost:5000';

function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{isSignup ? 'Sign Up' : 'Log In'}</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
          >
            {isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="w-full mt-2 text-blue-500 hover:underline text-center"
        >
          {isSignup ? 'Switch to Log In' : 'Switch to Sign Up'}
        </button>
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
          console.error('Error fetching survey:', error.response ? error.response.data : error.message);
          setSurveyJson({ pages: [{ elements: [] }], title: '', showPagesAsSeparate: false });
        });
    }
  }, [id]);

  const addQuestion = () => {
    let newQuestion = { 
      name: `q${Date.now()}-${surveyJson.pages[currentPage].elements.length + 1}`,
      title: questionTitle 
    };

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

  const handleDeleteQuestion = (questionName) => {
    const updatedPages = [...surveyJson.pages];
    updatedPages[currentPage].elements = updatedPages[currentPage].elements.filter(
      (element) => element.name !== questionName
    );
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
      console.error('Error saving survey:', error.response ? error.response.data : error.message);
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
        console.error('Error saving response:', error.response ? error.response.data : error.message);
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate('/dashboard')} className="mr-4 hover:underline text-white">Dashboard</button>
            <button onClick={() => signOut(auth)} className="hover:underline text-white">Log Out</button>
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
                  className={`p-2 rounded ${currentPage === index ? 'bg-blue-500 text-white' : 'bg-gray-200'} hover:bg-gray-300`}
                >
                  Section {index + 1}
                </button>
              ))}
              <button
                onClick={addSection}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
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
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition duration-200"
              >
                {questionType === 'nonanswerable' ? 'Add Content' : 'Add Question'}
              </button>
              <button
                onClick={saveSurvey}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
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
                        {page.elements.map((element) => (
                          <SortableItem key={element.name} id={element.name}>
                            <div className="p-2 bg-gray-100 rounded flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="mr-2">☰</span>
                                {element.type === 'html' ? (
                                  <span dangerouslySetInnerHTML={{ __html: element.html }} />
                                ) : (
                                  <span>{element.title} {element.isRequired && <span className="text-red-500 ml-2">(Required)</span>}</span>
                                )}
                              </div>
                              {element.type !== 'html' && (
                                <button
                                  onClick={() => handleDeleteQuestion(element.name)}
                                  className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition duration-200"
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
    axios.get(`/api/surveys?userId=${user.uid}`)
      .then(response => {
        const sortedSurveys = response.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setSurveys(sortedSurveys);
      })
      .catch(error => console.error('Error fetching surveys:', error.response ? error.response.data : error.message));
  }, [user.uid]);

  const handleDuplicate = async (survey) => {
    try {
      const newSurvey = {
        ...survey,
        id: Date.now().toString(),
        title: `${survey.title || `Untitled Survey #${survey.id}`} Copy`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await axios.post('/api/surveys', newSurvey);
      const response = await axios.get(`/api/surveys?userId=${user.uid}`);
      setSurveys(response.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      alert('Survey duplicated!');
    } catch (error) {
      console.error('Error duplicating survey:', error.response ? error.response.data : error.message);
      alert('Failed to duplicate survey');
    }
  };

  const handleDelete = async (surveyId) => {
    try {
      const response = await axios.get(`/api/responses?surveyId=${surveyId}`);
      const responses = response.data;

      if (responses.length > 0) {
        if (!window.confirm('This survey has responses. Are you sure you want to delete it?')) {
          return;
        }
      }

      await axios.delete(`/api/surveys/${surveyId}`);
      await axios.delete(`/api/responses/${surveyId}`);

      const updatedSurveys = await axios.get(`/api/surveys?userId=${user.uid}`);
      setSurveys(updatedSurveys.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      alert('Survey deleted!');
    } catch (error) {
      console.error('Error deleting survey:', error.response ? error.response.data : error.message);
      alert('Failed to delete survey');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate('/')} className="mr-4 hover:underline text-white">Create Survey</button>
            <button onClick={() => signOut(auth)} className="hover:underline text-white">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Surveys</h2>
          {surveys.length === 0 ? (
            <p className="text-gray-600">No surveys yet.</p>
          ) : (
            <ul className="space-y-4">
              {surveys.map(survey => (
                <li key={survey.id} className="border-b py-2 flex justify-between items-center">
                  <div>
                    <Link
                      to={`/survey/${survey.id}/details`}
                      className="text-blue-500 hover:underline font-medium text-lg"
                    >
                      {survey.title || `Untitled Survey #${survey.id}`}
                    </Link>
                    <div className="text-sm text-gray-600 mt-1">
                      ID: {survey.id} | Questions: {survey.pages ? survey.pages.reduce((total, page) => total + page.elements.length, 0) : 0} | 
                      Last Updated: {new Date(survey.updatedAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDuplicate(survey)}
                      className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition duration-200"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => navigate(`/survey/${survey.id}/send`)}
                      className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 transition duration-200"
                    >
                      Send Survey
                    </button>
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition duration-200"
                    >
                      Delete
                    </button>
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
    axios.get(`/api/surveys/${id}`)
      .then(response => setSurvey(response.data))
      .catch(error => {
        console.error('Error fetching survey:', error.response ? error.response.data : error.message);
        setSurvey(null);
      });

    axios.get(`/api/responses?surveyId=${id}`)
      .then(response => setResponses(response.data))
      .catch(error => console.error('Error fetching responses:', error.response ? error.response.data : error.message));
  }, [id]);

  const handleDelete = async () => {
    if (responses.length > 0) {
      if (!window.confirm('This survey has responses. Are you sure you want to delete it?')) {
        return;
      }
    }
    try {
      await axios.delete(`/api/surveys/${id}`);
      await axios.delete(`/api/responses/${id}`);
      alert('Survey deleted!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting survey:', error.response ? error.response.data : error.message);
      alert('Failed to delete survey');
    }
  };

  const handleDuplicate = async () => {
    try {
      const newSurvey = {
        ...survey,
        id: Date.now().toString(),
        title: `${survey.title || `Untitled Survey #${survey.id}`} Copy`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await axios.post('/api/surveys', newSurvey);
      alert('Survey duplicated!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error duplicating survey:', error.response ? error.response.data : error.message);
      alert('Failed to duplicate survey');
    }
  };

  if (!survey) return <p className="text-center mt-10 text-gray-600">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate('/dashboard')} className="mr-4 hover:underline text-white">Dashboard</button>
            <button onClick={() => signOut(auth)} className="hover:underline text-white">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">{survey.title || `Untitled Survey #${survey.id}`}</h2>
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => navigate(`/survey/${id}/edit`)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
            >
              Edit Survey
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition duration-200"
            >
              Delete Survey
            </button>
            <button
              onClick={handleDuplicate}
              className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition duration-200"
            >
              Duplicate
            </button>
            <button
              onClick={() => navigate(`/survey/${id}/send`)}
              className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 transition duration-200"
            >
              Send Survey
            </button>
            <button
              onClick={() => navigate(`/survey/${id}/responses`)}
              className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition duration-200"
            >
              See Responses
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <p>ID: {survey.id}</p>
            <p>Questions: {survey.pages ? survey.pages.reduce((total, page) => total + page.elements.length, 0) : 0}</p>
            <p>Responses: {responses.length}</p>
            <p>Last Updated: {new Date(survey.updatedAt || Date.now()).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveySendPage() {
  const { id } = useParams();
  const surveyLink = `${window.location.origin}/survey/${id}`;
  const navigate = useNavigate();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(surveyLink)
      .then(() => alert('Link copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <button onClick={() => navigate(`/survey/${id}/details`)} className="mr-4 hover:underline text-white">Back to Survey Details</button>
            <button onClick={() => navigate('/dashboard')} className="mr-4 hover:underline text-white">Dashboard</button>
            <button onClick={() => signOut(auth)} className="hover:underline text-white">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Send Survey</h2>
          <div className="flex items-center space-x-4">
            <label className="font-medium text-gray-700">Web Link:</label>
            <input
              type="text"
              value={surveyLink}
              readOnly
              className="flex-1 p-2 border rounded focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
            >
              Copy
            </button>
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
  const [viewMode, setViewMode] = useState('summaries');
  const [selectedResponse, setSelectedResponse] = useState(null);

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
      .catch(error => {
        console.error('Error fetching survey:', error.response ? error.response.data : error.message);
        setSurvey(null);
      });

    axios.get(`/api/responses?surveyId=${id}`)
      .then(response => {
        console.log('Fetched responses:', response.data);
        setResponses(response.data);
      })
      .catch(error => console.error('Error fetching responses:', error.response ? error.response.data : error.message));
  }, [id]);

  const processSurveyResults = () => {
    if (!survey) return null;

    const questions = survey.pages.flatMap(page => page.elements);
    const results = questions.map((question) => {
      if (question.type === 'html') {
        return {
          title: question.title,
          type: question.type,
          html: question.html
        };
      }

      const questionResponses = responses
        .filter(r => r.data && r.data[question.name] !== undefined)
        .map(r => r.data[question.name])
        .filter(response => response !== undefined);
      const commentResponses = responses
        .filter(r => r.data && r.data[`${question.name}-Comment`] !== undefined)
        .map(r => r.data[`${question.name}-Comment`])
        .filter(comment => comment !== undefined);

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
          datasets: [{
            label: 'Responses',
            data: [...question.choices.map(c => choiceCounts[c.text]), ...(question.hasOther ? [choiceCounts[question.otherText || 'Other']] : [])],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }],
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
          datasets: [{
            label: 'Responses',
            data: [...question.choices.map(c => choiceCounts[c.text]), ...(question.hasOther ? [choiceCounts[question.otherText || 'Other']] : [])],
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          }],
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

  if (!survey) return <p className="text-center mt-10 text-gray-600">Loading...</p>;

  const results = processSurveyResults();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-500 p-4 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">My NPS Platform</h1>
          <div>
            <Link to={`/survey/${id}/details`} className="mr-4 hover:underline text-white">Back to Survey Details</Link>
            <Link to="/dashboard" className="mr-4 hover:underline text-white">Dashboard</Link>
            <button onClick={() => signOut(auth)} className="hover:underline text-white">Log Out</button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Responses for: {survey.title || `Untitled Survey #${survey.id}`}</h2>
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => {
                setViewMode('summaries');
                setSelectedResponse(null);
              }}
              className={`p-2 rounded ${viewMode === 'summaries' ? 'bg-blue-500 text-white' : 'bg-gray-200'} hover:bg-gray-300`}
            >
              Question Summaries
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`p-2 rounded ${viewMode === 'single' ? 'bg-blue-500 text-white' : 'bg-gray-200'} hover:bg-gray-300`}
            >
              Single Responses
            </button>
          </div>

          {viewMode === 'summaries' && results && (
            <div>
              {results.questions.map((questionResult, index) => (
                <div key={index} className="mb-6">
                  {questionResult.type === 'html' ? (
                    <div
                      className="text-gray-700"
                      dangerouslySetInnerHTML={{ __html: questionResult.html }}
                    />
                  ) : (
                    <>
                      <h4 className="text-md font-semibold text-gray-800">{questionResult.title}</h4>
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
                          <p className="text-sm font-medium text-gray-700">Responses:</p>
                          <ul className="list-disc pl-5">
                            {questionResult.responses.map((resp, idx) => (
                              <li key={idx} className="text-sm text-gray-600">{resp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {questionResult.comments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700">Comments:</p>
                          <ul className="list-disc pl-5">
                            {questionResult.comments.map((comment, idx) => (
                              <li key={idx} className="text-sm text-gray-600">{comment}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === 'single' && (
            <div>
              {responses.length === 0 ? (
                <p className="text-gray-600">No responses yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-800">Responses</h3>
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
                        <h3 className="text-lg font-medium mb-4 text-gray-800">Response Details</h3>
                        <div className="text-sm text-gray-600 mb-4">
                          <p>Started: {new Date(selectedResponse.timestamp).toLocaleString()}</p>
                          <p>IP Address: Not available</p>
                        </div>
                        {survey.pages.flatMap(page => page.elements).map((question, index) => {
                          if (question.type === 'html') {
                            return null;
                          }
                          return (
                            <div key={index} className="mb-4">
                              <p className="font-semibold text-gray-800">Q{index + 1}: {question.title} {question.isRequired && <span className="text-red-500 ml-2">(Required)</span>}</p>
                              <p className="text-sm text-gray-600">
                                {selectedResponse.data[question.name] || 'Not answered'}
                              </p>
                              {selectedResponse.data[`${question.name}-Comment`] && (
                                <p className="text-sm mt-1 text-gray-600">
                                  Comment: {selectedResponse.data[`${question.name}-Comment`]}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600">Select a response to view details.</p>
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
    axios.get(`/api/surveys/${id}`)
      .then(response => {
        const surveyData = response.data;
        if (!surveyData.pages) {
          surveyData.pages = [{ elements: surveyData.elements || [] }];
          delete surveyData.elements;
        }
        if (!surveyData.showPagesAsSeparate) {
          surveyData.showPagesAsSeparate = false;
        }
        setSurveyJson(surveyData);
      })
      .catch(error => {
        console.error('Error fetching survey:', error.response ? error.response.data : error.message);
        setSurveyJson({ pages: [{ elements: [{ type: 'text', name: 'error', title: 'Survey not found' }] }] });
      });
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
      alert('Response saved!');
    } catch (error) {
      console.error('Error saving response:', error.response ? error.response.data : error.message);
      alert('Failed to save response');
    }
  };

  if (!surveyJson) return <p className="text-center mt-10 text-gray-600">Loading...</p>;

  const displaySurveyJson = surveyJson.showPagesAsSeparate ? surveyJson : {
    ...surveyJson,
    pages: [{ elements: surveyJson.pages.flatMap(page => page.elements) }]
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">{surveyJson?.title || 'Untitled Survey'}</h1>
        <Survey json={displaySurveyJson} onComplete={onComplete} />
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