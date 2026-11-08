import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import MaterialPreview from './MaterialPreview.jsx';
import './styles.css';
import './light-theme.css';
import './visual-overview.css';
createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).has('materials')?<MaterialPreview/>:<App/>);
