import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './containers/App';
import * as serviceWorker from './serviceWorker';

import { ApolloProvider } from '@apollo/react-hooks';
import ApolloClient, { gql } from 'apollo-boost';
import { InMemoryCache } from 'apollo-cache-inmemory';

const client = new ApolloClient({
  uri: 'http://localhost:4000',
  cache: new InMemoryCache(),
});

client
  .query({
    query: gql`
      {
        user(where: { name: "admin" }) {
          id
          name
          admin
          projects {
            id
          }
          languages {
            id
          }
        }
        projects(where: { users_some: { name: "admin" } }) {
          id
          name
          users {
            id
            name
          }
          languages {
            id
            iso
            code
            name
          }
          translations {
            id
            translation
            language {
              iso
            }
            literal {
              id
              literal
              as_in
            }
          }
          literals {
            id
            literal
            as_in
          }
        }
      }
    `,
  })
  .then(response => {
    let { user, projects } = response.data;

    ReactDOM.render(
      <ApolloProvider client={client}>
        <BrowserRouter>
          <App user={user} projects={projects} />
        </BrowserRouter>
      </ApolloProvider>,
      document.getElementById('root'),
    );

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: https://bit.ly/CRA-PWA
    serviceWorker.unregister();
  })
  .catch(e => {
    console.log(e);
  });
