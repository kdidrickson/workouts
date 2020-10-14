import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {withRouter, RouteComponentProps} from "react-router";

import {Exercise, Workout as WorkoutType, WorkoutSet} from './types';


interface WorkoutProps extends RouteComponentProps<{id: string}> {
  user: firebase.User;
}

interface WorkoutState {
  isRunning: boolean;
  workout?: WorkoutType;
  currentWorkoutSetId: string | null;
  exercises?: {[key: string]: Exercise},
  isResting: boolean;
}

class WorkoutWithoutRouter extends React.Component<WorkoutProps, WorkoutState> {
  constructor(props: WorkoutProps) {
    super(props);
    this.state = {
      isRunning: false,
      currentWorkoutSetId: null,
      isResting: false,
    };
    this.renderActiveWorkout = this.renderActiveWorkout.bind(this);
    this.renderStagingWorkout = this.renderStagingWorkout.bind(this);
  }

  componentDidMount() {
    firebase.database().ref(
      `workouts/${this.props.user.uid}/${this.props.match.params.id}`
    ).on('value', (snapshot) => {
      this.setState({workout: snapshot.val()});
    });
    firebase.database().ref(
      `exercises/${this.props.user.uid}`
    ).on('value', (snapshot) => {
      this.setState({exercises: snapshot.val()});
    });
  }

  getNextWorkoutSetId(): string | null {
    const {workout, currentWorkoutSetId} = this.state;

    if(!workout) {
      return null;
    }

    const workoutSetIds = Object.keys(workout.workoutSets);

    if(currentWorkoutSetId === null) {
      return workoutSetIds[0];
    }

    const currentIndex = workoutSetIds.findIndex(id => id === currentWorkoutSetId);
    if(currentIndex + 1 > workoutSetIds.length) {
      return null;
    }

    return workoutSetIds[currentIndex+1];
  }

  renderExerciseExecution(workoutSet: WorkoutSet, exercise: Exercise) {
    return (
      <div className="workout__active__exercise-execution">
        <div className="workout__active__target-reps">
          {`${workoutSet.targetReps} reps`}
        </div>
        {exercise.youtubeUrl && (
          <div className="workout__active__youtube">
            <iframe
              frameBorder="0"
              scrolling="no"
              src={`${exercise.youtubeUrl}?autoplay=0&fs=0&iv_load_policy=3&showinfo=0&rel=0&cc_load_policy=0&start=0&end=0&origin=https://youtubeembedcode.com`}
            />
          </div>
        )}
        {exercise.notes && <p className="workout__active__notes">{exercise.notes}</p>}
        <button
          className="workout__active__done-button"
          onClick={() => {
            this.setState({isResting: true});
          }}
        >
          Done!
        </button>
      </div>
    );
  }

  renderExericseLogging(workoutSet: WorkoutSet, exercise: Exercise) {
    return (
      <div className="workout__active__exercise-logging">
        
      </div>
    );
  }

  renderActiveWorkout() {
    const {exercises, currentWorkoutSetId, isResting} = this.state;
    const currentWorkoutSet = this.state.workout.workoutSets[currentWorkoutSetId];

    if(!currentWorkoutSet) {
      return (
        <h1>All done! 💪</h1>
      );
    }

    const currentExercise = exercises[currentWorkoutSet.exerciseId];

    return (
      <div className="workout__active">
        <h1>currentExercise.name</h1>
        {isResting ? this.renderExericseLogging(currentWorkoutSet, currentExercise) : this.renderExerciseExecution(currentWorkoutSet, currentExercise)}
      </div>
    );
  }

  renderStagingWorkout() {
    const {workout, exercises} = this.state;
    const {user, match: {params}} = this.props;

    if(workout === null) {
      return 'Couldn\'t find workout!';
    }

    if(!workout || !exercises) {
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