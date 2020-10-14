import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {withRouter, RouteComponentProps} from "react-router";

import {Exercise, Workout as WorkoutType} from './types';


interface WorkoutProps extends RouteComponentProps<{id: string}> {
  user: firebase.User;
}

interface WorkoutState {
  isRunning: boolean;
  workout?: WorkoutType;
}

class WorkoutWithoutRouter extends React.Component<WorkoutProps, WorkoutState> {
  constructor(props: WorkoutProps) {
    super(props);
    this.state = {
      isRunning: false,
    };
    this.renderActiveWorkout = this.renderActiveWorkout.bind(this);
    this.renderStagingWorkout = this.renderStagingWorkout.bind(this);
  }

  componentDidMount() {
    firebase.database().ref(
      `workouts/${this.props.user.uid}/${this.props.match.params.id}`
    ).on('value', (snapshot) => {
      this.setState({workout: snapshot.val()});
    })
  }

  renderActiveWorkout() {
    return null;
  }

  renderStagingWorkout() {
    const {workout} = this.state;
    const {user, match: {params}} = this.props;

    if(workout === null) {
      return 'Couldn\'t find workout!';
    }

    if(!workout) {
      return 'Loading...';
    }

    return (
      <div className="workout__staging">
        <h1>{workout.name}</h1>
        <button
          className="workout__staging__start-button"
          onClick={() => {
            this.setState({isRunning: true});
          }}
        >
          Start workout
        </button>
        <button
          className="workout__staging__delete-button"
          onClick={() => {
            const workoutRef = firebase.database().ref(`workouts/${user.uid}/${params.id}`);
            workoutRef.remove().then(() => {
              window.location.pathname = '/';
            })
          }}
        >
          Delete workout
        </button>
      </div>
    );
  }

  render() {
    return (
      <div className="workout">
        {this.state.isRunning ? this.renderActiveWorkout() : this.renderStagingWorkout()}
      </div>
    );
  }
}

export const Workout = withRouter<WorkoutProps, typeof WorkoutWithoutRouter>(WorkoutWithoutRouter);