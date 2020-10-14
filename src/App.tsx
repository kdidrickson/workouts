import React from 'react';
import './App.css';
import {Auth} from './Auth';
import {Home} from './Home';
import {Create} from './Create';

import * as firebase from "firebase/app";
import "firebase/auth";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

interface AppState {
  isSignedIn: boolean;
}

class App extends React.Component<{}, AppState> {
  state = {
    isSignedIn: false,
  }

  constructor(props: {}) {
    super(props);
    this.onAuthStateChanged = this.onAuthStateChanged.bind(this);
  }

  onAuthStateChanged(user: firebase.User | null) {
    this.setState({isSignedIn: !!user});
  }

  render() {
    const user = firebase.auth().currentUser as firebase.User;
    return (
      <Router>
        <Switch>
          <Route exact path="/login">
            {this.state.isSignedIn ? <Redirect to={'/'} /> : <Auth onAuthStateChanged={this.onAuthStateChanged} />}
          </Route>
          <Route exact path="/">
            {this.state.isSignedIn ? <Home user={user} /> : <Redirect to={'/login'} />}
          </Route>
          <Route path="/create">
            {this.state.isSignedIn ? <Create user={user} /> : <Redirect to={'/login'} />}
          </Route>
        </Switch>
      </Router>
    );
  }
}

export default App;
