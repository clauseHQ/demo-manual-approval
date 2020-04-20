import React, { useState, useEffect } from 'react';

import { Button, Header, Loader, Dimmer } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'
import './App.css';

const App = () => {
  const [context, setContext] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/context', {
      credentials: 'include'
    }).then(response => response.json())
    .then(json => {
      setContext(json);
      setLoading(false);
    });
  }, []);

  const handleClick = approved => {
    setLoading(true);
    fetch('/continue', {
      method: 'post',
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ approved }),
    })
    .then(response => response.json())
    .then(json => {
      setResult(json.success);
      setLoading(false);
    });
  };

  if(result !== null){
    return (
      <div className="App">
        <Header as='h3'>Manual Approval Step</Header>
        { result 
        ? <p>Your response was recorded.</p>
        : <p>An error occured while recording your response.</p>
        }
      </div>
    );
  }

  return (
    <div className="App">
      <Header as='h3'>Manual Approval Step</Header>
      { context && context.description
      ? <div> 
        <Dimmer active={loading}>
          <Loader>Loading</Loader>
        </Dimmer>
        <p>{context.description}</p>
        <Button color='red' onClick={() => handleClick(false)}>
          Reject
        </Button>
        <Button color='green' onClick={() => handleClick(true)}>
          Approve
        </Button>
      </div>
      : <p>This link has expired or is invalid.</p>
      }
    </div>
  );
}

export default App;