import React, { useState, useEffect } from 'react';

import { Form, TextArea, Button, Header } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'
import './App.css';

const App = () => {
  const [context, setContext] = useState(null);
  useEffect(() => {
    fetch('/context', {
      credentials: 'include'
    }).then(response => response.json())
    .then(json => setContext(json))
  }, []);

  // const token = new URLSearchParams(window.location.search).get('token');
  
  return (
    <div className="App">
      <header className="App-header">
        <Header>Manual Approval Step</Header>
        <Form>
          <TextArea value={context} />
          <TextArea placeholder='Comments' />
          <Button onClick={() => 
          fetch('/continue', {
            method: 'post',
            credentials: 'include'
          }).then(response => {
            console.log(response.status);
          })}>Approve</Button>
        </Form>
      </header>
    </div>
  );
}

export default App;