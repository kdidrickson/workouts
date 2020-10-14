import React from 'react';

import * as firebase from "firebase/app";
import "firebase/auth";
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';

const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    signInSuccessWithAuthResult: () => false
  }
};

interface AuthProps {
  onAuthStateChanged: (user: firebase.User | null) => void;
}

export class Auth extends React.Component<AuthProps, {}> {
  unregisterAuthObserver?: () => void;

  componentDidMount() {
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => this.props.onAuthStateChanged(user)
    );
  }
  
  componentWillUnmount() {
    this.unregisterAuthObserver && this.unregisterAuthObserver();
  }

  render() {
    return (
      <div className="auth">
        <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
      </div>
    );
  }
}
