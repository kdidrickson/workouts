import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {withRouter, RouteComponentProps} from "react-router";
import {Link} from 'react-router-dom';

import {ExerciseLogging} from './ExerciseLogging';
import {Exercise, Workout as WorkoutType, WorkoutSet, WorkoutSubset} from './types';


interface WorkoutProps extends RouteComponentProps<{id: string}> {
  user: firebase.User;
}

interface WorkoutState {
  isRunning: boolean;
  workout?: WorkoutType;
  currentWorkoutSetId: string | null;
  exercises?: {[key: string]: Exercise},
  isResting: boolean;
  workoutLogRef?: firebase.database.Reference;
  isFinished: boolean;
  setsCompleted: number;
  skippedSetIds: string[];
  snoozedSetIds: string[];
  start?: number;
  end?: number;
}

class WorkoutWithoutRouter extends React.Component<WorkoutProps, WorkoutState> {
  constructor(props: WorkoutProps) {
    super(props);
    this.state = {
      isRunning: false,
      currentWorkoutSetId: null,
      isResting: false,
      isFinished: false,
      setsCompleted: 0,
      skippedSetIds: [],
      snoozedSetIds: [],
    };
    this.renderActiveWorkout = this.renderActiveWorkout.bind(this);
    this.renderStagingWorkout = this.renderStagingWorkout.bind(this);
  }

  componentDidMount() {
    firebase.database().ref(
      `workouts/${this.props.user.uid}/${this.props.match.params.id}`
    ).once('value', (snapshot) => {
      this.setState({workout: snapshot.val()});
    });
    firebase.database().ref(
      `exercises/${this.props.user.uid}`
    ).on('value', (snapshot) => {
      this.setState({exercises: snapshot.val()});
    });
  }

  componentDidUpdate(prevProps: WorkoutProps, prevState: WorkoutState) {
    if(!prevState.workout && this.state.workout) {
      this.setState({
        currentWorkoutSetId: this.getNextWorkoutSetId(),
      });
    }

    if(!prevState.isRunning && this.state.isRunning) {
      const workoutLogRef = firebase.database().ref(`workoutLogs/${this.props.user.uid}`).push();
      const start = Date.now()
      workoutLogRef.set({start})
      this.setState({workoutLogRef, start});
    }

    if(!prevState.isFinished && this.state.isFinished && this.state.workoutLogRef) {
      const end = Date.now();
      this.state.workoutLogRef.update({end});
      this.setState({end});
    }
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
        <button
          className="workout__active__skip-button"
          onClick={() => {
            this.setState({skippedSetIds: [...this.state.skippedSetIds, this.state.currentWorkoutSetId]});
            if(this.state.workoutLogRef) {
              this.state.workoutLogRef.child(`workoutSets/${this.state.currentWorkoutSetId}`).update({
                skipped: true,
              })
            }
          }}
        >
          Skip
        </button>
        <button
          className="workout__active__snooze-button"
          onClick={() => {
            this.setState({snoozedSetIds: [...this.state.snoozedSetIds, this.state.currentWorkoutSetId]});
          }}
        >
          Snooze
        </button>
      </div>
    );
  }

  renderFinishedWorkout() {
    const {start, end} = this.state;

    let workoutDuration;
    if(start && end) {
      const date = new Date(0);
      date.setMilliseconds(end - start);
      workoutDuration = date.toISOString().substr(11, 8);
    }

    return (
      <div className="workout__finished">
        <h1>All done! 💪</h1>
        {workoutDuration && (
          <p className="workout__finished__duration">
            {`Workout duration: ${workoutDuration}`}
          </p>
        )}
        <Link className="workout__finished__home-button" to="/">
          Back home
        </Link>
      </div>
    );
  }

  renderActiveWorkout() {
    const {
      exercises,
      currentWorkoutSetId,
      isResting,
      workoutLogRef,
      isFinished,
      setsCompleted,
    } = this.state;
    
    if(isFinished) {
      return this.renderFinishedWorkout();
    }

    if(!currentWorkoutSetId) {
      return 'Loading...';
    }

    const currentWorkoutSet = this.state.workout.workoutSets[currentWorkoutSetId];
    const currentExercise = exercises[currentWorkoutSet.exerciseId];

    return (
      <div className="workout__active">
        <h1>{currentExercise.name}</h1>
        {isResting ?
          <ExerciseLogging
            workoutSet={currentWorkoutSet}
            exercise={currentExercise}
            onSubmit={async (workoutSubsets: WorkoutSubset[]) => {
              if(workoutLogRef && currentWorkoutSetId) {
                workoutLogRef.child(`workoutSets/${currentWorkoutSetId}`).set({setsCompleted});
                const subsetsRef = workoutLogRef.child(`workoutSets/${currentWorkoutSetId}/subsets`);
                workoutSubsets.forEach(workoutSubset => subsetsRef.push().set(workoutSubset));
              }
              const nextWorkoutSetId = this.getNextWorkoutSetId();
              this.setState({
                isResting: false,
                currentWorkoutSetId: nextWorkoutSetId,
                isFinished: !nextWorkoutSetId,
                setsCompleted: setsCompleted + 1,
              });
            }}
          /> :
          this.renderExerciseExecution(currentWorkoutSet, currentExercise)
        }
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