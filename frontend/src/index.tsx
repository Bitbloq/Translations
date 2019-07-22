import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './containers/App';
import * as serviceWorker from './serviceWorker';
import { User, Language, Translation, Literal, Project } from './types';

const user: User = {
  id: 1,
  admin: true,
  name: 'admin',
  allowLanguages: [1, 2, 3],
  allowProjects: [1, 2],
};
const users: User[] = [
  {
    id: 1,
    admin: true,
    name: 'admin',
    allowLanguages: [1, 2, 3],
    allowProjects: [1, 2],
  },
  {
    id: 2,
    admin: false,
    name: 'carlos',
    allowLanguages: [1, 2],
    allowProjects: [1, 2],
  },
  {
    id: 3,
    admin: false,
    name: 'otro',
    allowLanguages: [1, 3],
    allowProjects: [2],
  },
  {
    id: 4,
    admin: false,
    name: 'Max',
    allowLanguages: [2, 3],
    allowProjects: [1],
  },
];
const projects: Project[] = [
  {
    id: 1,
    name: 'bitbloq',
    languages: [1, 2],
  },
  {
    id: 2,
    name: 'digicraft',
    languages: [1, 2, 3],
  },
];
const literals: Literal[] = [
  {
    id: 1,
    project_id: 1,
    literal: 'landing_welcome',
    as_in: 'as in: WELCOME to my home!',
  },
  {
    id: 2,
    project_id: 1,
    literal: 'printer',
    as_in: 'as in: can you repair my PRINTER?',
  },
  {
    id: 2,
    project_id: 2,
    literal: 'printer',
    as_in: 'as in: can you repair my PRINTER?',
  },
  {
    id: 3,
    project_id: 1,
    literal: 'robot',
    as_in: 'as in: a ROBOT has cleaned the kitchen',
  },
];
const translations: Translation[] = [
  {
    id: 1,
    lang_id: 1,
    lit_id: 1,
    project_id: 1,
    translation: 'Bienvenido',
  },
  {
    id: 2,
    lang_id: 1,
    lit_id: 2,
    project_id: 1,
    translation: 'Impresora',
  },
  {
    id: 2,
    lang_id: 1,
    lit_id: 2,
    project_id: 2,
    translation: 'Impresora',
  },
];
const languages: Language[] = [
  {
    id: 1,
    name: 'Spanish',
    iso: 'es',
  },
  {
    id: 2,
    name: 'English',
    iso: 'en',
  },
  {
    id: 3,
    name: 'French',
    iso: 'fr',
  },
  {
    id: 4,
    name: 'Italian',
    iso: 'it',
  },
  {
    id: 5,
    name: 'German',
    iso: 'gr',
  },
  {
    id: 6,
    name: 'Russian',
    iso: 'rs',
  },
];

ReactDOM.render(
  <App
    user={user}
    users={users}
    literals={literals}
    translations={translations}
    languages={languages}
    projects={projects}
  />,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
