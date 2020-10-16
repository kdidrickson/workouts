import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {withRouter, RouteComponentProps} from "react-router";
import {Link} from 'react-router-dom';
import * as lodash from 'lodash';

import {ExerciseLogging} from './ExerciseLogging';
import {Exercise, Workout as WorkoutType, WorkoutSet, WorkoutSubset, WorkoutLog} from './types';
import { last } from 'lodash';


interface WorkoutProps extends RouteComponentProps<{id: string}> {
  user: firebase.User;
}

interface WorkoutState {
  isRunning: boolean;
  workout?: WorkoutType;
  currentWorkoutSetId: string | null;
  exercises?: {[key: string]: Exercise},
  workoutLogs?: {[key: string]: WorkoutLog} | null;
  isResting: boolean;
  workoutLogRef?: firebase.database.Reference;
  isFinished: boolean;
  setsCompleted: number;
  finishedSetIds: string[];
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
      finishedSetIds: [],
      skippedSetIds: [],
      snoozedSetIds: [],
    };
    this.renderActiveWorkout = this.renderActiveWorkout.bind(this);
    this.renderStagingWorkout = this.renderStagingWorkout.bind(this);
    this.isFinished = this.isFinished.bind(this);
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
    firebase.database().ref(
      `workoutLogs/${this.props.user.uid}`
    ).limitToLast(3).on('value', (snapshot) => {
      this.setState({workoutLogs: snapshot.val()});
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

    const finishedSetIdsDidUpdate = prevState.finishedSetIds !== this.state.finishedSetIds;
    const skippedSetIdsDidUpdate = prevState.skippedSetIds !== this.state.skippedSetIds;
    if(finishedSetIdsDidUpdate || skippedSetIdsDidUpdate) {
      const snoozedSetIds = lodash.difference(
        this.state.snoozedSetIds,
        this.state.finishedSetIds,
        this.state.skippedSetIds,
      );
      this.setState({
        snoozedSetIds,
        setsCompleted: this.state.setsCompleted + Number(finishedSetIdsDidUpdate),
        isFinished: this.isFinished(),
        currentWorkoutSetId: this.getNextWorkoutSetId(),
        isResting: false,
      });
    }

    if(prevState.snoozedSetIds !== this.state.snoozedSetIds) {
      this.setState({
        currentWorkoutSetId: this.getNextWorkoutSetId(),
      });
    }
  }

  isFinished() {
    const {finishedSetIds, skippedSetIds, workout} = this.state;
    return finishedSetIds.length + skippedSetIds.length >= Object.keys(workout.workoutSets).length;
  }

  getNextWorkoutSetId(): string | null {
    const {workout, finishedSetIds, skippedSetIds, snoozedSetIds, currentWorkoutSetId} = this.state;

    if(!workout) {
      return null;
    }

    let virginWorkoutSets = {...workout.workoutSets};
    finishedSetIds.forEach(finishedSetId => {
      delete virginWorkoutSets[finishedSetId];
    });
    skippedSetIds.forEach(skippedSetId => {
      delete virginWorkoutSets[skippedSetId];
    });
    snoozedSetIds.forEach(snoozedSetId => {
      delete virginWorkoutSets[snoozedSetId];
    });

    const virginWorkoutSetIds = Object.keys(virginWorkoutSets);
    if(virginWorkoutSetIds.length) {
      return virginWorkoutSetIds[0];
    }

    if(snoozedSetIds.length) {
      const currentSnoozedIndex = lodash.indexOf(snoozedSetIds, currentWorkoutSetId);
      return snoozedSetIds[currentSnoozedIndex + 1] || snoozedSetIds[0];
    }

    return null;
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
        {this.state.snoozedSetIds.length > 1 || this.state.currentWorkoutSetId !== this.state.snoozedSetIds[0] && (
          <button
            className="workout__active__snooze-button"
            onClick={() => {
              this.setState({snoozedSetIds: [...this.state.snoozedSetIds, this.state.currentWorkoutSetId]});
            }}
          >
            Snooze
          </button>
        )}
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
      workout,
      exercises,
      currentWorkoutSetId,
      isResting,
      workoutLogRef,
      isFinished,
      setsCompleted,
      finishedSetIds
    } = this.state;
    
    if(isFinished) {
      return this.renderFinishedWorkout();
    }

    if(!currentWorkoutSetId) {
      return 'Loading...';
    }

    const currentWorkoutSet = workout.workoutSets[currentWorkoutSetId];
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
              this.setState({
                finishedSetIds: [...finishedSetIds, currentWorkoutSetId],
              });
            }}
          /> :
          this.renderExerciseExecution(currentWorkoutSet, currentExercise)
        }
      </div>
    );
  }

  renderWorkoutHistorySummary(workoutLogs: {[key: string]: WorkoutLog} | null) {
    if(workoutLogs) {
      const workoutLogsKeys = Object.keys(workoutLogs);
      const lastWorkoutLog = workoutLogs[workoutLogsKeys[workoutLogsKeys.length - 1]];
      if(lastWorkoutLog.start) {
        const lastWorkoutStartDate = new Date(lastWorkoutLog.start);
        return `You last did this workout on ${lastWorkoutStartDate.toISOString().slice(0,10)}`;
      }
    }

    return `You've never done this workout before.`;
  }

  renderStagingWorkout() {
    const {workout, exercises, workoutLogs} = this.state;
    const {user, match: {params}} = this.props;

    if(workout === null) {
      return `Couldn't find workout!`;
    }

    if(!workout || !exercises || workoutLogs === undefined) {
      return `Loading...`;
    }

    return (
      <div className="workout__staging">
        <h1>{workout.name}</h1>
        <div className="workout__history-summary">
          {this.renderWorkoutHistorySummary(workoutLogs)}
        </div>
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