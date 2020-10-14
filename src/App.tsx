import React from 'react';
import './App.css';
import {Auth} from './Auth';
import {Home} from './Home';
import {Create} from './Create';
import {Workout} from './Workout';

import * as firebase from "firebase/app";
import "firebase/auth";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

interface AppState {
  isSignedIn: boolean | null;
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      isSignedIn: null,
    };
  }

  unregisterAuthObserver?: () => void;

  componentDidMount() {
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => this.setState({isSignedIn: !!user})
    );
  }
  
  componentWillUnmount() {
    this.unregisterAuthObserver && this.unregisterAuthObserver();
  }

  render() {
    if(this.state.isSignedIn === null) {
      return 'Loading...';
    }

    const user = firebase.auth().currentUser as firebase.User;
    return (
      <Router>
        <Switch>
          <Route exact path="/login">
            {this.state.isSignedIn ? <Redirect to={'/'} /> : <Auth />}
          </Route>
          <Route exact path="/">
            {this.state.isSignedIn ? <Home user={user} /> : <Redirect to={'/login'} />}
          </Route>
          <Route path="/create">
            {this.state.isSignedIn ? <Create user={user} /> : <Redirect to={'/login'} />}
          </Route>
          <Route path="/workout/:id">
            {this.state.isSignedIn ? <Workout user={user} /> : <Redirect to={'/login'} />}
          </Route>
        </Switch>
      </Router>
    );
  }
}

export default App;
