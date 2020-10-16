// import 'bootstrap/dist/css/bootstrap.min.css';

import Navbar from 'react-bootstrap/Navbar';

import React from 'react';
import './App.scss';
import {PageLoadSpinner} from './PageLoadSpinner';
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

  renderNavbar() {
    const user = firebase.auth().currentUser;
    return (
      <div className="app-navbar">
        <Navbar bg="primary" variant="dark">
          <Navbar.Brand href="/">Workouts</Navbar.Brand>
          {user && (
            <Navbar.Collapse className="justify-content-end">
              <Navbar.Text>
                {user.displayName}
                <button
                  className="logout-button"
                  onClick={() => {
                    firebase.auth().signOut().then(() => {
                      window.location.pathname = '/login';
                    })
                  }}
                >
                  Log out
                </button>
              </Navbar.Text>
            </Navbar.Collapse>
          )}
        </Navbar>
      </div>
    );
  }

  render() {
    const user = firebase.auth().currentUser as firebase.User;
    return (
      <div className="app">
        {this.renderNavbar()}
        {this.state.isSignedIn === null ? <PageLoadSpinner /> : (
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
        )}
      </div>
    );
  }
}

export default App;
